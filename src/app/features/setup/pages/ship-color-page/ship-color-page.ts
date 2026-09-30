import { Component, computed, inject } from '@angular/core';
import { SHIP_COLORS } from '@core/models/ship-color';
import { SetupStore } from '@core/services/setup-store';
import { Button } from '@shared/ui/button/button';
import { Ship } from '@shared/ui/ship/ship';
import { Tile } from '@shared/ui/tile/tile';

/**
 * Preview lengths for the colour picker only. The real fleet composition is a game rule
 * and will come from the `src/game` package.
 */
const PREVIEW_SHIP_LENGTHS = [3, 4, 5] as const;

/** Setup step 2: pick a fleet colour; the preview ships recolour on every pick. */
@Component({
  selector: 'app-ship-color-page',
  imports: [Button, Ship, Tile],
  styleUrl: './ship-color-page.scss',
  templateUrl: './ship-color-page.html',
})
export class ShipColorPage {
  protected readonly store = inject(SetupStore);
  protected readonly colors = SHIP_COLORS;

  protected readonly ships = computed(() => {
    const color = this.store.shipColorDef();
    return PREVIEW_SHIP_LENGTHS.map((length) => ({
      length,
      label: `${length}-block ship${color ? `, ${color.label.toLowerCase()}` : ''}`,
    }));
  });
}
