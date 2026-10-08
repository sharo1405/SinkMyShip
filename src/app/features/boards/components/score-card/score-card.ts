import { Component, computed, input } from '@angular/core';
import { SUPERPOWERS } from '@core/models/superpowers';
import type { SeatScore } from '@sinkmyship/game';

/** The pop-up note for a shot that earned a bonus or a penalty, or for a power paid for. */
interface Badge {
  /**
   * Which shot or payment this is (`shot-<n>`, `paid-<n>`), so each new one gets a fresh
   * element and replays its animation, while the opponent's moves leave it alone.
   */
  readonly id: string;
  readonly text: string;
  readonly bonus: boolean;
}

/**
 * One side's score, shown above that side's board. After a shot that earns the streak bonus
 * ("+4 streak!") or a miss penalty ("-2 two misses", "-1 miss streak"), a short badge pops up
 * and fades. The badge shows the points actually removed, which is less near the zero floor,
 * and none at all when the side had no points to lose. It is removed on the side's next
 * ordinary shot. Paying for a superpower shows "-2 Radar" the same way; after a power that
 * fires, its shot badge comes first and the payment badge pops up just after it.
 */
@Component({
  selector: 'app-score-card',
  templateUrl: './score-card.html',
  styleUrl: './score-card.scss',
})
export class ScoreCard {
  /** Visible heading and accessible name, e.g. "Your score". */
  readonly label = input.required<string>();
  readonly score = input.required<SeatScore>();

  protected readonly unit = computed(() => (Math.abs(this.score().points) === 1 ? 'pt' : 'pts'));

  /**
   * Up to two badges, in the order they happened: the latest shot's, then the payment for
   * the power that fired it. Tracked by `id`, so misses in a row (or scans in a row) replay
   * the pop-and-fade animation each time, and the opponent's moves don't.
   */
  protected readonly badges = computed<readonly Badge[]>(() => {
    const { last, shots, payment, payments } = this.score();
    const badges: Badge[] = [];
    // With a payment, only a shot fired by that same power belongs to the latest action.
    const shotIsLatest = !payment || last?.power === payment.power;
    // A penalty at 0 points removes nothing (scores stop at 0), so there is nothing to show.
    if (last && last.delta !== 0 && shotIsLatest) {
      const id = `shot-${shots}`;
      switch (last.kind) {
        case 'hit-streak':
          badges.push({ id, text: `+${last.delta} streak!`, bonus: true });
          break;
        case 'second-miss':
          badges.push({ id, text: `${last.delta} two misses`, bonus: false });
          break;
        case 'miss-streak':
          badges.push({ id, text: `${last.delta} miss streak`, bonus: false });
          break;
      }
    }
    if (payment && payment.delta < 0) {
      const name = SUPERPOWERS.find((p) => p.id === payment.power)?.label ?? payment.power;
      badges.push({ id: `paid-${payments}`, text: `${payment.delta} ${name}`, bonus: false });
    }
    return badges;
  });
}
