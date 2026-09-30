import { Component, computed, input } from '@angular/core';

/**
 * A ship drawn as a horizontal row of `length` blocks, filled with `color`
 * (neutral when `null`). Exposed to assistive tech as a single image named by `label`.
 */
@Component({
  selector: 'app-ship',
  styleUrl: './ship.scss',
  templateUrl: './ship.html',
  host: {
    role: 'img',
    '[attr.aria-label]': 'label()',
    '[style.--ship-color]': 'color()',
  },
})
export class Ship {
  readonly length = input.required<number>();
  readonly label = input.required<string>();
  readonly color = input<string | null>(null);

  protected readonly blocks = computed(() => Array.from({ length: this.length() }, (_, i) => i));
}
