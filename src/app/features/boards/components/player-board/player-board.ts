import { Component, computed, inject, input } from '@angular/core';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerPlacement } from '@core/services/player-placement/player-placement';
import { PlayerShield } from '@core/services/player-shield/player-shield';
import { ownShotMarks, shipCells } from '../../utils/shot-marks';
import { Board } from '../board/board';

/**
 * The player's own board: their ships (and the one being placed), plus where the computer
 * has fired. Clicks go to placement while ships are missing or one is being removed.
 * While the Shield is up the cells get a glowing ring and the caption says "Shield up";
 * after the shield blocks a shot the ring flashes red (both drawn by `Board`).
 */
@Component({
  selector: 'app-player-board',
  imports: [Board],
  template: `
    <app-board
      idPrefix="player"
      [label]="label()"
      rowLabelSide="start"
      [size]="size()"
      [shipCells]="ships()"
      [draftCells]="placement.draft()"
      [missCells]="shots().miss"
      [hitCells]="shots().hit"
      [sunkCells]="shots().sunk"
      [rejected]="placement.rejected()"
      [shipColor]="shipColor()"
      [interactive]="interactive()"
      [shielded]="shield.up()"
      [alert]="shield.alerting()"
      (cellClick)="placement.clickCell($event)"
    />
  `,
})
export class PlayerBoard {
  private readonly game = inject(GameStore);
  protected readonly placement = inject(PlayerPlacement);
  protected readonly shield = inject(PlayerShield);

  readonly size = input.required<number>();
  readonly shipColor = input<string | null>(null);

  /** Caption and accessible name; says when the shield is up. */
  protected readonly label = computed(() =>
    this.shield.up() ? 'Your board: Shield up' : 'Your board',
  );
  protected readonly ships = computed(() => shipCells(this.game.playerBoard()));
  protected readonly shots = computed(() => ownShotMarks(this.game.playerBoard()));
  protected readonly interactive = computed(
    () =>
      this.game.phase() === 'placing' &&
      (this.placement.removing() ||
        this.game.fleet().some((s) => !this.game.placedShipIds().has(s.id))),
  );
}
