import { computed, Service, signal } from '@angular/core';
import { COMPUTER, PLAYER } from '@core/models/seats';
import {
  canFire,
  canStartBattle,
  createGame,
  fire,
  fleetFor,
  opponentView,
  passTurn,
  placeFleetRandomly,
  placeShip,
  removeShip,
  startBattle,
  type Board,
  type BoardSize,
  type Coord,
  type GameState,
  type LogEntry,
  type OpponentView,
  type Phase,
  type Rng,
  type Seat,
  type ShipSpec,
} from '@sinkmyship/game';

/**
 * The one owner of the game state. Wraps the `@sinkmyship/game` rules in signals: every
 * rule call runs on a clone inside `commit()`, because the rules mutate in place and a
 * signal holding the same reference would never notify.
 *
 * No timers and no decisions here: `PlayerPlacement`, `PlayerTurn` and `ComputerPlayer`
 * decide what to do, and `MatchController` decides who acts next.
 */
@Service()
export class GameStore {
  private readonly state = signal<GameState | null>(null);

  readonly phase = computed<Phase | null>(() => this.state()?.phase ?? null);
  readonly turn = computed<Seat | null>(() => this.state()?.turn ?? null);
  readonly winner = computed<Seat | null>(() => this.state()?.winner ?? null);
  readonly log = computed<readonly LogEntry[]>(() => this.state()?.log ?? []);

  /** Whether the battle is on and it's `seat`'s turn. Reads signals, so use it in `computed`. */
  isTurnOf(seat: Seat): boolean {
    return this.phase() === 'battle' && this.turn() === seat;
  }

  /** The player's own board: ships and the computer's shots at it. */
  readonly playerBoard = computed<Readonly<Board> | null>(
    () => this.state()?.boards[PLAYER] ?? null,
  );
  /** The computer's full board. Only for display outside the battle (placement, game over). */
  readonly computerBoard = computed<Readonly<Board> | null>(
    () => this.state()?.boards[COMPUTER] ?? null,
  );
  /** What the player may know about the computer's board. */
  readonly enemyView = computed<OpponentView | null>(() => this.viewFor(PLAYER));
  /** What the computer may know about the player's board. */
  readonly computerView = computed<OpponentView | null>(() => this.viewFor(COMPUTER));

  /** The fleet each seat places, in display order. */
  readonly fleet = computed<readonly ShipSpec[]>(() => {
    const size = this.state()?.size;
    return size ? fleetFor(size) : [];
  });
  readonly placedShipIds = computed<ReadonlySet<string>>(
    () => new Set(this.playerBoard()?.ships.map((s) => s.id)),
  );
  /** Both fleets are complete and the game is still in placement. */
  readonly canStartBattle = computed(() => {
    const state = this.state();
    return state !== null && canStartBattle(state);
  });

  /** A fresh game with both boards empty. */
  newGame(size: BoardSize): void {
    this.state.set(createGame(size));
  }

  placeShip(seat: Seat, spec: ShipSpec, cells: readonly Coord[]): void {
    this.commit((game) => placeShip(game.boards[seat], spec, cells));
  }

  removeShip(seat: Seat, id: string): void {
    this.commit((game) => removeShip(game.boards[seat], id));
  }

  /** Places every ship `seat` is still missing at random. */
  placeFleetRandomly(seat: Seat, rng: Rng): void {
    this.commit((game) => placeFleetRandomly(game.boards[seat], rng));
  }

  startBattle(): void {
    this.commit((game) => startBattle(game));
  }

  canFire(seat: Seat, at: Coord): boolean {
    const state = this.state();
    return state !== null && canFire(state, seat, at);
  }

  fire(seat: Seat, at: Coord): void {
    this.commit((game) => fire(game, seat, at));
  }

  passTurn(seat: Seat): void {
    this.commit((game) => passTurn(game, seat));
  }

  private viewFor(seat: Seat): OpponentView | null {
    const state = this.state();
    return state ? opponentView(state, seat) : null;
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
