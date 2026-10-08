import { Component, computed, input } from '@angular/core';
import type { SeatScore } from '@sinkmyship/game';

/** The pop-up note for a shot that earned a bonus or a penalty. */
interface Badge {
  /** The side's shot count, so each new triggering shot gets a fresh badge. */
  readonly shot: number;
  readonly text: string;
  readonly bonus: boolean;
}

/**
 * One side's score, shown above that side's board. After a shot that earns the streak bonus
 * ("+4 streak!") or a miss penalty ("-2 two misses", "-1 miss streak"), a short badge pops up
 * and fades. The badge shows the points actually removed, which is less near the zero floor,
 * and none at all when the side had no points to lose. It is removed on the side's next
 * ordinary shot.
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
   * Zero or one badge, as a list tracked by shot number: misses in a row can trigger badges
   * on consecutive shots, and a fresh element per shot replays the pop-and-fade animation.
   * The opponent's shots don't change `shots`, so they don't replay it.
   */
  protected readonly badges = computed<readonly Badge[]>(() => {
    const { last, shots } = this.score();
    // A penalty at 0 points removes nothing (scores stop at 0), so there is nothing to show.
    if (!last || last.delta === 0) return [];
    switch (last.kind) {
      case 'hit-streak':
        return [{ shot: shots, text: `+${last.delta} streak!`, bonus: true }];
      case 'second-miss':
        return [{ shot: shots, text: `${last.delta} two misses`, bonus: false }];
      case 'miss-streak':
        return [{ shot: shots, text: `${last.delta} miss streak`, bonus: false }];
      default:
        return [];
    }
  });
}
