import { Component, computed, inject } from '@angular/core';
import { PLAYER } from '@core/models/seats';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerPlacement } from '@core/services/player-placement/player-placement';
import { PlayerDoubleMissiles } from '@core/services/player-double-missiles/player-double-missiles';
import { PlayerRadar } from '@core/services/player-radar/player-radar';
import { PlayerShotgun } from '@core/services/player-shotgun/player-shotgun';
import { PlayerTurn } from '@core/services/player-turn/player-turn';
import { describeRadar } from '../../utils/radar/describe-radar';
import { describeTargeting } from '../../utils/double-missiles/describe-targeting';
import { describeVolley, lastVolley } from '../../utils/describe-volley';
import { describeTurn } from '../../utils/describe-turn';

/**
 * The status line under the boards: what to do next and what the last turn did.
 * A polite live region, so screen readers announce every change.
 */
@Component({
  selector: 'app-battle-status',
  template: `<p role="status">{{ message() }}</p>`,
  styles: `
    p {
      min-height: 1.5em;
      margin: 0;
      text-align: center;
    }
  `,
})
export class BattleStatus {
  private readonly game = inject(GameStore);
  private readonly placement = inject(PlayerPlacement);
  private readonly turn = inject(PlayerTurn);
  private readonly radar = inject(PlayerRadar);
  private readonly shotgun = inject(PlayerShotgun);
  private readonly missiles = inject(PlayerDoubleMissiles);

  protected readonly message = computed(() => {
    switch (this.game.phase()) {
      case 'placing':
        if (this.placement.removing()) return 'Click a ship on your board to remove it.';
        if (this.placement.canReady()) return 'All ships placed. Press Ready to start the battle.';
        return 'Pick a ship under your board, then click its blocks on your board.';
      case 'battle': {
        const scan = this.radar.scan();
        if (scan) return `${describeRadar(scan)} Fire when the scan ends.`;
        if (this.radar.aiming()) {
          return "Pick a cell to scan its row and column on the computer's board. Press Radar again to cancel.";
        }
        if (this.shotgun.armed()) {
          return 'Press the red Click button to fire the Shotgun. Press Shotgun again to cancel.';
        }
        if (this.missiles.armed()) {
          return describeTargeting(this.missiles.targets().length, this.missiles.targetCount());
        }
        const log = this.game.log();
        const last = log.at(-1);
        const volley = lastVolley(log);
        const lead = volley
          ? describeVolley(volley)
          : last
            ? describeTurn(last)
            : this.placement.autoPlaced()
              ? 'Time is up. Your remaining ships were placed for you.'
              : '';
        const next = this.turn.active()
          ? "Your turn: fire at the computer's board."
          : 'The computer is aiming…';
        return `${lead} ${next}`.trim();
      }
      case 'over': {
        const volley = lastVolley(this.game.log());
        const result =
          this.game.winner() === PLAYER
            ? 'You win! You sank the whole computer fleet.'
            : 'You lose. The computer sank your fleet.';
        return volley ? `${describeVolley(volley)} ${result}` : result;
      }
      default:
        return '';
    }
  });
}
