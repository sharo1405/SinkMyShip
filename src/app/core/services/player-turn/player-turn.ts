import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import type { SeatController } from '@core/models/seat-controller';
import { PLAYER } from '@core/models/seats';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerPowers } from '@core/services/player-powers/player-powers';
import { PlayerRadar } from '@core/services/player-radar/player-radar';
import { PlayerRandomShots } from '@core/services/player-random-shots/player-random-shots';
import { Countdown } from '@core/utils/countdown/countdown';
import { injectIsBrowser } from '@core/utils/platform/platform';
import { TurnHandoff } from '@core/utils/turn-handoff/turn-handoff';
import { TURN_TIME_LIMIT_MS, type Coord } from '@sinkmyship/game';

/**
 * The player's side of the battle: firing at the computer's board and the 10-second turn
 * clock. When the clock runs out the turn is skipped. While the Radar is being aimed, a click
 * on the computer's board scans instead of firing, and firing waits until the scan's result
 * has been shown; the radar never ends the turn. Random shots, fired with its Click button,
 * is the whole turn, like a normal shot.
 */
@Service()
export class PlayerTurn implements SeatController {
  private readonly game = inject(GameStore);
  private readonly radar = inject(PlayerRadar);
  private readonly randomShots = inject(PlayerRandomShots);
  private readonly powers = inject(PlayerPowers);
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
    this.radar.stop();
    this.powers.clear();
    this.rejectedTargetState.set(null);
  }

  /** A click on the computer's board: scans while the Radar is being aimed, else fires. */
  targetCell(coord: Coord): void {
    if (this.radar.aiming()) {
      this.rejectedTargetState.set(null);
      this.radar.scanAt(coord);
    } else {
      this.fireAt(coord);
    }
  }

  /**
   * Fires at `coord` on the computer's board. A cell already fired at is rejected instead.
   * Ignored while a radar scan is showing, so its result can't be clicked through.
   */
  fireAt(coord: Coord): void {
    if (!this.active() || this.radar.scanning()) return;
    if (!this.game.canFire(PLAYER, coord)) {
      this.rejectedTargetState.set(coord);
      return;
    }
    this.rejectedTargetState.set(null);
    this.game.fire(PLAYER, coord);
    this.end();
  }

  /** The red Click button under an armed Random shots: fires the volley as the whole turn. */
  fireRandomShots(): void {
    if (!this.active() || this.radar.scanning()) return;
    if (!this.randomShots.fire()) return;
    this.rejectedTargetState.set(null);
    this.end();
  }

  private end(): void {
    this.clock.stop();
    this.radar.stop();
    this.powers.clear();
    this.handoff.finish();
  }
}
