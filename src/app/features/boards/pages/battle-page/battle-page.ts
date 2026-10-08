import { Component, computed, DestroyRef, inject } from '@angular/core';
import { SUPERPOWERS, type PowerState } from '@core/models/superpowers';
import { GameStore } from '@core/services/game-store/game-store';
import { MatchController } from '@core/services/match-controller/match-controller';
import { PlayerDoubleMissiles } from '@core/services/player-double-missiles/player-double-missiles';
import { PlayerPlacement } from '@core/services/player-placement/player-placement';
import { PlayerRadar } from '@core/services/player-radar/player-radar';
import { PlayerShield } from '@core/services/player-shield/player-shield';
import { PlayerShotgun } from '@core/services/player-shotgun/player-shotgun';
import { PlayerTurn } from '@core/services/player-turn/player-turn';
import { ScoreKeeper } from '@core/services/score-keeper/score-keeper';
import { SetupStore } from '@core/services/setup-store/setup-store';
import { Button } from '@shared/ui/button/button';
import type { SuperpowerId } from '@sinkmyship/game';
import { BattleStatus } from '../../components/battle-status/battle-status';
import { ComputerBoard } from '../../components/computer-board/computer-board';
import { GameClock } from '../../components/game-clock/game-clock';
import { PlacementControls } from '../../components/placement-controls/placement-controls';
import { PlayerBoard } from '../../components/player-board/player-board';
import { PowerBar } from '../../components/power-bar/power-bar';
import { ScoreCard } from '../../components/score-card/score-card';

/**
 * The battle screen, at the board size and ship colour chosen in setup. Opening it starts a
 * new match (`MatchController`); leaving it stops every clock.
 *
 * Layout only: during the battle each side's board has its score above it and its
 * superpowers row under it (player on the left, computer on the right). Also the placement
 * controls under the player's board, the clock (top right), the blocks-remaining box (top
 * left) and the status line.
 * `setupCompleteGuard` makes sure a board has been chosen before this page opens.
 */
@Component({
  selector: 'app-battle-page',
  imports: [
    BattleStatus,
    Button,
    ComputerBoard,
    GameClock,
    PlacementControls,
    PlayerBoard,
    PowerBar,
    ScoreCard,
  ],
  styleUrl: './battle-page.scss',
  templateUrl: './battle-page.html',
})
export class BattlePage {
  private readonly setup = inject(SetupStore);
  private readonly match = inject(MatchController);
  protected readonly game = inject(GameStore);
  protected readonly placement = inject(PlayerPlacement);
  protected readonly scores = inject(ScoreKeeper);
  private readonly radar = inject(PlayerRadar);
  private readonly shotgun = inject(PlayerShotgun);
  private readonly missiles = inject(PlayerDoubleMissiles);
  private readonly shield = inject(PlayerShield);
  private readonly turn = inject(PlayerTurn);
  /** Shown under both boards. */
  protected readonly superpowers = SUPERPOWERS;
  /** The player's power buttons; the computer's powers are display only. */
  protected readonly playerPowerStates = computed<Partial<Record<SuperpowerId, PowerState>>>(
    () => ({
      radar: this.radar.state(),
      shotgun: this.shotgun.state(),
      'double-missiles': this.missiles.state(),
      shield: this.shield.state(),
    }),
  );
  /** Double Missiles' Click stays grey until its targets are picked. */
  protected readonly playerActionDisabled = computed<Partial<Record<SuperpowerId, boolean>>>(
    () => ({ 'double-missiles': !this.missiles.ready() }),
  );

  protected readonly size = computed(() => this.setup.boardOptionDef()?.size ?? null);
  protected readonly shipColor = computed(() => this.setup.shipColorDef()?.value ?? null);

  constructor() {
    this.playAgain();
    inject(DestroyRef).onDestroy(() => this.match.stop());
  }

  /** A power's block was pressed: switch that power on or off. */
  protected usePower(power: SuperpowerId): void {
    if (power === 'radar') this.radar.toggleAiming();
    if (power === 'shotgun') this.shotgun.toggle();
    if (power === 'double-missiles') this.missiles.toggle();
    if (power === 'shield') this.shield.activate();
  }

  /** An active power's action button was pressed. */
  protected runPowerAction(power: SuperpowerId): void {
    if (power === 'shotgun') this.turn.fireShotgun();
    if (power === 'double-missiles') this.turn.fireDoubleMissiles();
  }

  protected playAgain(): void {
    const size = this.size();
    if (size) this.match.newGame(size);
  }
}
