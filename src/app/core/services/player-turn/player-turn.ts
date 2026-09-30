import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import type { SeatController } from '@core/models/seat-controller';
import { PLAYER } from '@core/models/seats';
import { GameStore } from '@core/services/game-store/game-store';
import { Countdown } from '@core/utils/countdown/countdown';
import { injectIsBrowser } from '@core/utils/platform/platform';
import { TurnHandoff } from '@core/utils/turn-handoff/turn-handoff';
import { TURN_TIME_LIMIT_MS, type Coord } from '@sinkmyship/game';

/**
 * The player's side of the battle: firing at the computer's board and the 40-second turn
 * clock. When the clock runs out the turn is skipped.
 */
@Service()
export class PlayerTurn implements SeatController {
  private readonly game = inject(GameStore);
  private readonly clock = new Countdown(injectIsBrowser());
  private readonly handoff = new TurnHandoff();

  private readonly rejectedTargetState = signal<Coord | null>(null);

  /** True while it's the player's turn to fire. */
  readonly active = computed(() => this.game.isTurnOf(PLAYER));
  /** The last cell the player tried to fire at twice. */
  readonly rejectedTarget = this.rejectedTargetState.asReadonly();
  readonly timeLeftMs = this.clock.timeLeftMs;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Starts the player's turn and its clock (browser only). */
  start(onDone: () => void): void {
    this.handoff.begin(onDone);
    this.rejectedTargetState.set(null);
    this.clock.start(TURN_TIME_LIMIT_MS, () => {
      this.game.passTurn(PLAYER);
      this.end();
    });
  }

  stop(): void {
    this.clock.stop();
    this.handoff.cancel();
    this.rejectedTargetState.set(null);
  }

  /** Fires at `coord` on the computer's board. A cell already fired at is rejected instead. */
  fireAt(coord: Coord): void {
    if (!this.active()) return;
    if (!this.game.canFire(PLAYER, coord)) {
      this.rejectedTargetState.set(coord);
      return;
    }
    this.rejectedTargetState.set(null);
    this.game.fire(PLAYER, coord);
    this.end();
  }

  private end(): void {
    this.clock.stop();
    this.handoff.finish();
  }
}
