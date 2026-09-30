import { Component, input } from '@angular/core';

/**
 * A square, clickable tile applied to a native `<button>`: board choices, colour swatches.
 *
 * - `pressed`: `true`/`false` makes it a toggle button (`aria-pressed`) and `true` shows the
 *   yellow selection border; `null` (default) leaves it a plain action button.
 * - `color`: fill colour (any CSS colour); falls back to the neutral tile colour.
 */
@Component({
  selector: 'button[appTile]',
  styleUrl: './tile.scss',
  templateUrl: './tile.html',
  host: {
    class: 'app-tile',
    '[class.selected]': 'pressed() === true',
    '[attr.aria-pressed]': 'pressed()',
    '[style.--tile-color]': 'color()',
  },
})
export class Tile {
  readonly pressed = input<boolean | null>(null);
  readonly color = input<string | null>(null);
}
