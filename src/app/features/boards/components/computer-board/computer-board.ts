import { Component, computed, inject, input } from '@angular/core';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerDoubleMissiles } from '@core/services/player-double-missiles/player-double-missiles';
import { PlayerRadar } from '@core/services/player-radar/player-radar';
import { PlayerTurn } from '@core/services/player-turn/player-turn';
import { enemyShotMarks, shipCells } from '../../utils/shot-marks';
import { Board } from '../board/board';

/**
 * The computer's board as the player sees it: during the battle only the results of the
 * player's shots (never ships still afloat); the whole fleet during placement and at the
 * end. Clicks fire at it while it's the player's turn, or scan it while the Radar is aimed;
 * a scan's result shows as an overlay (white borders on the ship squares it found). While
 * Double Missiles is armed, clicks pick targets, which show as target rings.
 */
@Component({
  selector: 'app-computer-board',
  imports: [Board],
  template: `
    <app-board
      idPrefix="computer"
      label="Computer's board"
      rowLabelSide="end"
      [size]="size()"
      [shipCells]="ships()"
      [missCells]="shots().miss"
      [hitCells]="shots().hit"
      [sunkCells]="shots().sunk"
      [rejected]="turn.rejectedTarget()"
      [scannedCells]="scanned()"
      [radarCells]="found()"
      [targetCells]="missiles.targets()"
      [aiming]="radar.aiming() || missiles.armed()"
      [interactive]="turn.active()"
      (cellClick)="turn.targetCell($event)"
    />
  `,
})
export class ComputerBoard {
  private readonly game = inject(GameStore);
  protected readonly turn = inject(PlayerTurn);
  protected readonly radar = inject(PlayerRadar);
  protected readonly missiles = inject(PlayerDoubleMissiles);

  readonly size = input.required<number>();

  protected readonly ships = computed(() =>
    this.game.phase() === 'battle' ? [] : shipCells(this.game.computerBoard()),
  );
  protected readonly shots = computed(() => enemyShotMarks(this.game.enemyView()));
  protected readonly scanned = computed(() => this.radar.scan()?.cells ?? []);
  protected readonly found = computed(() => this.radar.scan()?.found ?? []);
}
