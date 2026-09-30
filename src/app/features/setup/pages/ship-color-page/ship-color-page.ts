import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { fleetFor } from '@sinkmyship/game';
import { SHIP_COLORS } from '@core/models/ship-color';
import { SetupStore } from '@core/services/setup-store';
import { Button } from '@shared/ui/button/button';
import { Ship } from '@shared/ui/ship/ship';
import { Tile } from '@shared/ui/tile/tile';

/**
 * Setup step 2: pick a fleet colour; the preview shows the fleet for the board chosen in
 * step 1 and recolours on every pick. No ships are shown until a board is chosen.
 * Confirming goes to the battle.
 */
@Component({
  selector: 'app-ship-color-page',
  imports: [Button, Ship, Tile],
  styleUrl: './ship-color-page.scss',
  templateUrl: './ship-color-page.html',
})
export class ShipColorPage {
  protected readonly store = inject(SetupStore);
  private readonly router = inject(Router);
  protected readonly colors = SHIP_COLORS;

  protected readonly ships = computed(() => {
    const board = this.store.boardOptionDef();
    if (!board) return [];
    const color = this.store.shipColorDef();
    return fleetFor(board.size).map(({ id, length }) => ({
      id,
      length,
      label: `${length}-block ship${color ? `, ${color.label.toLowerCase()}` : ''}`,
    }));
  });

  protected async confirm(): Promise<void> {
    await this.router.navigate(['/battle']);
  }
}
