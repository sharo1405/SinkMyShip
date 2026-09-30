import { isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, inject, PLATFORM_ID, Service, signal } from '@angular/core';
import { RNG } from '@core/models/rng';
import {
  canExtend,
  createGame,
  fleetFor,
  PLACEMENT_TIME_LIMIT_MS,
  placeFleetRandomly,
  placeShip,
  removeShip,
  shipAt,
  type Board,
  type BoardSize,
  type Coord,
  type GameState,
  type ShipSpec,
} from '@sinkmyship/game';

/** Seat 0 is the local player, seat 1 the computer. */
const PLAYER = 0;
const COMPUTER = 1;

/** How often the placement countdown refreshes. */
const CLOCK_TICK_MS = 1000;

/**
 * The one owner of the running game. Wraps the `@sinkmyship/game` rules in signals: every
 * rule call runs on a clone inside `commit()`, because the rules mutate in place and a
 * signal holding the same reference would never notify.
 *
 * Also holds the player's placement session: the selected ship, the blocks chosen so far,
 * the last rejected cell, remove mode, and the countdown. When the countdown runs out the
 * missing ships are placed at random and placement locks. Whether a block is allowed is
 * always decided by the rules (`canExtend`).
 */
@Service()
export class GameStore {
  private readonly rng = inject(RNG);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly state = signal<GameState | null>(null);
  private readonly selectedShipIdState = signal<string | null>(null);
  private readonly draftState = signal<readonly Coord[]>([]);
  private readonly rejectedState = signal<Coord | null>(null);
  private readonly removingState = signal(false);
  private readonly placementOverState = signal(false);
  private readonly deadline = signal<number | null>(null);
  private readonly now = signal(0);
  private clock: ReturnType<typeof setInterval> | null = null;

  readonly playerBoard = computed<Readonly<Board> | null>(
    () => this.state()?.boards[PLAYER] ?? null,
  );
  /** Shown in full while placement is being built; becomes an opponent view once firing exists. */
  readonly computerBoard = computed<Readonly<Board> | null>(
    () => this.state()?.boards[COMPUTER] ?? null,
  );

  /** The player's fleet in display order. */
  readonly fleet = computed<readonly ShipSpec[]>(() => {
    const size = this.state()?.size;
    return size ? fleetFor(size) : [];
  });
  readonly placedShipIds = computed<ReadonlySet<string>>(
    () => new Set(this.playerBoard()?.ships.map((s) => s.id)),
  );
  readonly selectedShip = computed<ShipSpec | null>(
    () => this.fleet().find((s) => s.id === this.selectedShipIdState()) ?? null,
  );
  readonly draft = this.draftState.asReadonly();
  readonly rejected = this.rejectedState.asReadonly();
  /** Blocks still to place for the selected ship; `null` while no ship is selected. */
  readonly remaining = computed<number | null>(() => {
    const ship = this.selectedShip();
    return ship ? ship.length - this.draftState().length : null;
  });

  /** While on, clicking a placed ship on the player's board takes it off again. */
  readonly removing = this.removingState.asReadonly();
  /** Remove needs at least one whole ship on the board. */
  readonly canRemove = computed(() => !this.placementOverState() && this.placedShipIds().size > 0);
  /** True once the countdown has run out: the fleet is complete and can't be changed. */
  readonly placementOver = this.placementOverState.asReadonly();
  /** Placement time left in ms; `null` when no countdown is running (e.g. on the server). */
  readonly timeLeftMs = computed<number | null>(() => {
    const deadline = this.deadline();
    return deadline === null ? null : Math.max(0, deadline - this.now());
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopClock());
  }

  /**
   * Starts a new game: empty player board, computer fleet placed at random, and a fresh
   * placement countdown (browser only).
   */
  newGame(size: BoardSize): void {
    const game = createGame(size);
    placeFleetRandomly(game.boards[COMPUTER], this.rng);
    this.state.set(game);
    this.placementOverState.set(false);
    this.removingState.set(false);
    this.resetPlacement(null);
    this.startClock();
  }

  /** Stops the countdown, e.g. when the player leaves the battle screen. */
  stopClock(): void {
    if (this.clock !== null) clearInterval(this.clock);
    this.clock = null;
  }

  /** Picks a ship to place; any half-placed blocks of the previous pick are discarded. */
  selectShip(id: string): void {
    if (this.placementOverState()) return;
    if (!this.fleet().some((s) => s.id === id) || this.placedShipIds().has(id)) return;
    this.removingState.set(false);
    this.resetPlacement(id);
  }

  /** Turns remove mode on or off. Entering it drops the ship being placed. */
  toggleRemoving(): void {
    if (!this.removingState() && !this.canRemove()) return;
    this.removingState.update((on) => !on);
    this.resetPlacement(null);
  }

  /** A click on the player's board: removes a ship in remove mode, otherwise places a block. */
  clickCell(coord: Coord): void {
    if (this.placementOverState()) return;
    if (this.removingState()) {
      this.removeAt(coord);
    } else {
      this.placeBlock(coord);
    }
  }

  /**
   * Adds a block of the selected ship at `coord`. An illegal block is recorded in `rejected`
   * instead. When the last block goes down the ship is placed and the selection clears.
   */
  private placeBlock(coord: Coord): void {
    const ship = this.selectedShip();
    const board = this.playerBoard();
    if (!ship || !board) return;

    const draft = this.draftState();
    if (!canExtend(board, ship, draft, coord)) {
      this.rejectedState.set(coord);
      return;
    }
    const cells = [...draft, coord];
    if (cells.length < ship.length) {
      this.draftState.set(cells);
      this.rejectedState.set(null);
      return;
    }
    this.commit((game) => placeShip(game.boards[PLAYER], ship, cells));
    this.resetPlacement(null);
  }

  /** Takes the ship at `coord` off the board; a click on open water is rejected. */
  private removeAt(coord: Coord): void {
    const board = this.playerBoard();
    const ship = board && shipAt(board, coord);
    if (!ship) {
      this.rejectedState.set(coord);
      return;
    }
    this.commit((game) => removeShip(game.boards[PLAYER], ship.id));
    this.removingState.set(false);
    this.resetPlacement(null);
  }

  private startClock(): void {
    this.stopClock();
    this.deadline.set(null);
    if (!this.isBrowser) return;
    const start = Date.now();
    this.now.set(start);
    this.deadline.set(start + PLACEMENT_TIME_LIMIT_MS);
    this.clock = setInterval(() => this.tick(), CLOCK_TICK_MS);
  }

  private tick(): void {
    const now = Date.now();
    this.now.set(now);
    const deadline = this.deadline();
    if (deadline !== null && now >= deadline) this.timeUp();
  }

  /** Places whatever the player hasn't, at random, and locks placement. */
  private timeUp(): void {
    this.stopClock();
    this.commit((game) => placeFleetRandomly(game.boards[PLAYER], this.rng));
    this.removingState.set(false);
    this.resetPlacement(null);
    this.placementOverState.set(true);
  }

  private resetPlacement(selectedId: string | null): void {
    this.selectedShipIdState.set(selectedId);
    this.draftState.set([]);
    this.rejectedState.set(null);
  }

  /** The only way game state changes: apply a mutating rule call to a fresh clone. */
  private commit(change: (game: GameState) => void): void {
    this.state.update((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      change(next);
      return next;
    });
  }
}
