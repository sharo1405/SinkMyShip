import { Component, input, output } from '@angular/core';
import type { PowerState, SuperpowerDef } from '@core/models/superpowers';
import type { SuperpowerId } from '@sinkmyship/game';

/**
 * A row of superpower blocks, shown under a board. A power with an entry in `states` is a
 * button (pressed while `active`, disabled while `unavailable`) that emits `activate`; the
 * rest are display-only blocks. The row wraps to 2x2 when the board is
 * narrow.
 */
@Component({
  selector: 'app-power-bar',
  templateUrl: './power-bar.html',
  styleUrl: './power-bar.scss',
})
export class PowerBar {
  /** Accessible name of the row, e.g. "Your superpowers". */
  readonly label = input.required<string>();
  readonly powers = input.required<readonly SuperpowerDef[]>();
  /** Powers that can be used from this row, and how each button looks now. */
  readonly states = input<Partial<Record<SuperpowerId, PowerState>>>({});

  readonly activate = output<SuperpowerId>();
}
