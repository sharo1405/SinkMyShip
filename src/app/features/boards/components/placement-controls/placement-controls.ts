import { Component, computed, inject, input } from '@angular/core';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerPlacement } from '@core/services/player-placement/player-placement';
import { Button } from '@shared/ui/button/button';
import { Ship } from '@shared/ui/ship/ship';

/**
 * Under the player's board during placement: the ship tray (pick a ship to place; placed
 * ships are dimmed), Remove (once a whole ship is down) and Ready (once all are down).
 */
@Component({
  selector: 'app-placement-controls',
  imports: [Button, Ship],
  styleUrl: './placement-controls.scss',
  templateUrl: './placement-controls.html',
})
export class PlacementControls {
  private readonly game = inject(GameStore);
  protected readonly placement = inject(PlayerPlacement);

  readonly shipColor = input<string | null>(null);

  protected readonly tray = computed(() => {
    const placed = this.game.placedShipIds();
    const selected = this.placement.selectedShip()?.id;
    return this.game.fleet().map(({ id, length }) => ({
      id,
      length,
      placed: placed.has(id),
      selected: id === selected,
      label: `${length}-block ship${placed.has(id) ? ', placed' : ''}`,
    }));
  });
}
