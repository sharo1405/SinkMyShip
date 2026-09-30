import { Component, computed, inject } from '@angular/core';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerPlacement } from '@core/services/player-placement/player-placement';
import { PlayerTurn } from '@core/services/player-turn/player-turn';
import { formatClock } from '@shared/utils/format-clock';

/**
 * The top-right box: the placement countdown, the player's turn clock, or whose turn it is.
 * Hidden when the game is over.
 */
@Component({
  selector: 'app-game-clock',
  template: `
    @if (text(); as text) {
      <div class="clock" role="timer">{{ text }}</div>
    }
  `,
  styles: `
    :host {
      position: absolute;
      top: 1rem;
      right: 1rem;
    }

    .clock {
      padding: 0.5rem 0.75rem;
      border: 2px solid var(--color-grid-line);
      border-radius: 0.5rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class GameClock {
  private readonly game = inject(GameStore);
  private readonly placement = inject(PlayerPlacement);
  private readonly turn = inject(PlayerTurn);

  protected readonly text = computed(() => {
    switch (this.game.phase()) {
      case 'placing': {
        const ms = this.placement.timeLeftMs();
        return ms === null ? null : `Time left: ${formatClock(ms)}`;
      }
      case 'battle': {
        if (!this.turn.active()) return "Computer's turn";
        const ms = this.turn.timeLeftMs();
        return ms === null ? 'Your turn' : `Your turn: ${formatClock(ms)}`;
      }
      default:
        return null;
    }
  });
}
