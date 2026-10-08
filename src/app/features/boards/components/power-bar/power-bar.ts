import { Component, computed, input, output } from '@angular/core';
import type { PowerState, SuperpowerDef } from '@core/models/superpowers';
import type { SuperpowerId } from '@sinkmyship/game';

/**
 * A row of superpower blocks, shown under a board. A power with an entry in `states` is a
 * button (pressed while `active`, pressed and disabled while `on`, disabled while
 * `unavailable`) that emits `activate`; the
 * rest are display-only blocks. While a power with an `action` is active, a round red
 * button under its block emits `runAction`; it is grey and disabled while `actionDisabled`
 * says the power isn't ready (e.g. targets still to pick). Every block shows its price; given
 * the side's `points`, a block it can't afford is marked as such, visibly and in its
 * accessible name ("Radar, costs 2 points, you have 1"). The row wraps to 2x2 when the board is
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
  /** Powers whose action button is shown but can't be pressed yet. */
  readonly actionDisabled = input<Partial<Record<SuperpowerId, boolean>>>({});
  /** The side's score, to tell which powers it can't afford; `null` for a display-only row. */
  readonly points = input<number | null>(null);

  readonly activate = output<SuperpowerId>();
  readonly runAction = output<SuperpowerId>();

  /** Per power: too expensive for `points` right now. */
  protected readonly unaffordable = computed<Partial<Record<SuperpowerId, boolean>>>(() => {
    const points = this.points();
    return Object.fromEntries(
      this.powers().map((p) => [p.id, points !== null && points < p.price]),
    );
  });

  /** Per power: the button's accessible name, with the price and, if short, the points. */
  protected readonly names = computed<Partial<Record<SuperpowerId, string>>>(() => {
    const points = this.points();
    return Object.fromEntries(
      this.powers().map((p) => {
        const short = points !== null && points < p.price ? `, you have ${points}` : '';
        return [p.id, `${p.label}, costs ${p.price} points${short}`];
      }),
    );
  });
}
