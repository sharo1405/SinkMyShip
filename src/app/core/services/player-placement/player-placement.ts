import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import { RNG } from '@core/models/rng';
import { PLAYER } from '@core/models/seats';
import { GameStore } from '@core/services/game-store/game-store';
import { Countdown } from '@core/utils/countdown/countdown';
import { injectIsBrowser } from '@core/utils/platform/platform';
import { TurnHandoff } from '@core/utils/turn-handoff/turn-handoff';
import {
  canExtend,
  PLACEMENT_TIME_LIMIT_MS,
  shipAt,
  type Coord,
  type ShipSpec,
} from '@sinkmyship/game';

/**
 * The player's side of placement: the selected ship, the blocks chosen so far, the last
 * rejected cell, remove mode and the five-minute clock. Whether a block is allowed is
 * always decided by the rules (`canExtend`).
 *
 * Placement ends when the player presses Ready or the clock runs out (the missing ships are
 * then placed at random); either way the `onDone` callback given to `start()` runs.
 */
@Service()
export class PlayerPlacement {
  private readonly game = inject(GameStore);
  private readonly rng = inject(RNG);
  private readonly clock = new Countdown(injectIsBrowser());
  private readonly handoff = new TurnHandoff();

  private readonly selectedShipId = signal<string | null>(null);
  private readonly draftState = signal<readonly Coord[]>([]);
  private readonly rejectedState = signal<Coord | null>(null);
  private readonly removingState = signal(false);
  private readonly autoPlacedState = signal(false);

  readonly selectedShip = computed<ShipSpec | null>(
    () => this.game.fleet().find((s) => s.id === this.selectedShipId()) ?? null,
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
  /** Remove needs at least one whole ship on the board, during placement. */
  readonly canRemove = computed(
    () => this.game.phase() === 'placing' && this.game.placedShipIds().size > 0,
  );
  /** Ready appears once the whole fleet is placed. */
  readonly canReady = computed(() => this.game.canStartBattle());
  /** True when the clock ran out and the missing ships were placed for the player. */
  readonly autoPlaced = this.autoPlacedState.asReadonly();
  readonly timeLeftMs = this.clock.timeLeftMs;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Opens placement for a new game and starts the clock (browser only). */
  start(onDone: () => void): void {
    this.handoff.begin(onDone);
    this.autoPlacedState.set(false);
    this.removingState.set(false);
    this.select(null);
    this.clock.start(PLACEMENT_TIME_LIMIT_MS, () => this.timeUp());
  }

  stop(): void {
    this.clock.stop();
    this.handoff.cancel();
  }

  /** Picks a ship to place; any half-placed blocks of the previous pick are discarded. */
  selectShip(id: string): void {
    if (this.game.phase() !== 'placing') return;
    if (!this.game.fleet().some((s) => s.id === id) || this.game.placedShipIds().has(id)) return;
    this.removingState.set(false);
    this.select(id);
  }

  /** Turns remove mode on or off. Entering it drops the ship being placed. */
  toggleRemoving(): void {
    if (!this.removingState() && !this.canRemove()) return;
    this.removingState.update((on) => !on);
    this.select(null);
  }

  /** A click on the player's board: removes a ship in remove mode, otherwise places a block. */
  clickCell(coord: Coord): void {
    if (this.game.phase() !== 'placing') return;
    if (this.removingState()) {
      this.removeAt(coord);
    } else {
      this.placeBlock(coord);
    }
  }

  /** The whole fleet is down and the player starts the battle. */
  ready(): void {
    if (this.canReady()) this.finish();
  }

  /**
   * Adds a block of the selected ship at `coord`. An illegal block is recorded in `rejected`
   * instead. When the last block goes down the ship is placed and the selection clears.
   */
  private placeBlock(coord: Coord): void {
    const ship = this.selectedShip();
    const board = this.game.playerBoard();
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
    this.game.placeShip(PLAYER, ship, cells);
    this.select(null);
  }

  /** Takes the ship at `coord` off the board; a click on open water is rejected. */
  private removeAt(coord: Coord): void {
    const board = this.game.playerBoard();
    const ship = board && shipAt(board, coord);
    if (!ship) {
      this.rejectedState.set(coord);
      return;
    }
    this.game.removeShip(PLAYER, ship.id);
    this.removingState.set(false);
    this.select(null);
  }

  private timeUp(): void {
    this.game.placeFleetRandomly(PLAYER, this.rng);
    this.autoPlacedState.set(true);
    this.finish();
  }

  private finish(): void {
    this.clock.stop();
    this.removingState.set(false);
    this.select(null);
    this.handoff.finish();
  }

  private select(id: string | null): void {
    this.selectedShipId.set(id);
    this.draftState.set([]);
    this.rejectedState.set(null);
  }
}
