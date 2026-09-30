import { DestroyRef, inject, Service } from '@angular/core';
import { COMPUTER_SHOT_DELAY_MS } from '@core/models/game-timing';
import { RNG } from '@core/models/rng';
import type { SeatController } from '@core/models/seat-controller';
import { COMPUTER } from '@core/models/seats';
import { GameStore } from '@core/services/game-store/game-store';
import { injectIsBrowser } from '@core/utils/platform/platform';
import { TurnHandoff } from '@core/utils/turn-handoff/turn-handoff';
import { chooseShot } from '@sinkmyship/game';

/**
 * The computer's side of the game: it places its fleet at random, and on its turn fires
 * `COMPUTER_SHOT_DELAY_MS` after the turn starts. The aiming itself is `chooseShot` from
 * the rules package, which only sees what the computer may know (`computerView`).
 */
@Service()
export class ComputerPlayer implements SeatController {
  private readonly game = inject(GameStore);
  private readonly rng = inject(RNG);
  private readonly delayMs = inject(COMPUTER_SHOT_DELAY_MS);
  private readonly isBrowser = injectIsBrowser();
  private readonly handoff = new TurnHandoff();
  private move: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  placeFleet(): void {
    this.game.placeFleetRandomly(COMPUTER, this.rng);
  }

  /** Takes the computer's turn after its delay (browser only). */
  start(onDone: () => void): void {
    this.stop();
    if (!this.isBrowser) return;
    this.handoff.begin(onDone);
    this.move = setTimeout(() => {
      this.move = null;
      this.fire();
      this.handoff.finish();
    }, this.delayMs);
  }

  stop(): void {
    if (this.move !== null) clearTimeout(this.move);
    this.move = null;
    this.handoff.cancel();
  }

  private fire(): void {
    const view = this.game.computerView();
    if (!view || !this.game.isTurnOf(COMPUTER)) return;
    this.game.fire(COMPUTER, chooseShot(view, this.rng));
  }
}
