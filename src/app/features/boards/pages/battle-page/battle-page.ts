import { Component, computed, DestroyRef, inject } from '@angular/core';
import { GameStore } from '@core/services/game-store/game-store';
import { MatchController } from '@core/services/match-controller/match-controller';
import { PlayerPlacement } from '@core/services/player-placement/player-placement';
import { SetupStore } from '@core/services/setup-store/setup-store';
import { Button } from '@shared/ui/button/button';
import { BattleStatus } from '../../components/battle-status/battle-status';
import { ComputerBoard } from '../../components/computer-board/computer-board';
import { GameClock } from '../../components/game-clock/game-clock';
import { PlacementControls } from '../../components/placement-controls/placement-controls';
import { PlayerBoard } from '../../components/player-board/player-board';

/**
 * The battle screen, at the board size and ship colour chosen in setup. Opening it starts a
 * new match (`MatchController`); leaving it stops every clock.
 *
 * Layout only: the player's board with the placement controls under it, the computer's
 * board, the clock (top right), the blocks-remaining box (top left) and the status line.
 * `setupCompleteGuard` makes sure a board has been chosen before this page opens.
 */
@Component({
  selector: 'app-battle-page',
  imports: [BattleStatus, Button, ComputerBoard, GameClock, PlacementControls, PlayerBoard],
  styleUrl: './battle-page.scss',
  templateUrl: './battle-page.html',
})
export class BattlePage {
  private readonly setup = inject(SetupStore);
  private readonly match = inject(MatchController);
  protected readonly game = inject(GameStore);
  protected readonly placement = inject(PlayerPlacement);

  protected readonly size = computed(() => this.setup.boardOptionDef()?.size ?? null);
  protected readonly shipColor = computed(() => this.setup.shipColorDef()?.value ?? null);

  constructor() {
    this.playAgain();
    inject(DestroyRef).onDestroy(() => this.match.stop());
  }

  protected playAgain(): void {
    const size = this.size();
    if (size) this.match.newGame(size);
  }
}
