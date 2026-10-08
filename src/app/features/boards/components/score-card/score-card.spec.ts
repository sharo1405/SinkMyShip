import { TestBed } from '@angular/core/testing';
import { INITIAL_SCORE, type ScoreChange, type SeatScore } from '@sinkmyship/game';
import { ScoreCard } from './score-card';

/** A score whose latest shot (number `shots`) scored `last`. Streak counts don't matter here. */
const score = (points: number, shots: number, last: ScoreChange | null): SeatScore => ({
  points,
  shots,
  hitStreak: 0,
  missStreak: 0,
  last,
});

describe('ScoreCard', () => {
  async function render(initial: SeatScore) {
    const fixture = TestBed.createComponent(ScoreCard);
    fixture.componentRef.setInput('label', 'Your score');
    fixture.componentRef.setInput('score', initial);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const card = root.querySelector('[role="group"][aria-label="Your score"]');
    /** The card's visible parts (label, points, badge), joined by single spaces. */
    const text = () =>
      [...(card?.children ?? [])]
        .map((part) => part.textContent?.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(' ');
    const badge = () => card?.querySelector('.badge') ?? null;
    const show = async (next: SeatScore) => {
      fixture.componentRef.setInput('score', next);
      await fixture.whenStable();
    };
    return { card, text, badge, show };
  }

  it('shows the label and the points, with no badge at the start', async () => {
    const { card, text } = await render(INITIAL_SCORE);
    expect(card).not.toBeNull();
    expect(text()).toBe('Your score 0 pts');
  });

  it('shows the whole +4 for a streak-completing hit, and no badge for a plain hit', async () => {
    const { text, show } = await render(score(6, 3, { kind: 'hit-streak', delta: 4 }));
    expect(text()).toBe('Your score 6 pts +4 streak!');

    await show(score(7, 4, { kind: 'hit', delta: 1 }));
    expect(text()).toBe('Your score 7 pts');
  });

  it('shows no badge for a first miss, -2 for the second and -1 for each one after', async () => {
    const { text, badge, show } = await render(score(9, 2, { kind: 'miss', delta: 0 }));
    expect(text()).toBe('Your score 9 pts');

    await show(score(7, 3, { kind: 'second-miss', delta: -2 }));
    expect(text()).toBe('Your score 7 pts -2 two misses');

    const before = badge();
    await show(score(6, 4, { kind: 'miss-streak', delta: -1 }));
    expect(text()).toBe('Your score 6 pts -1 miss streak');
    expect(badge()).not.toBe(before);

    // A new badge element per shot, so the pop-and-fade animation replays.
    const third = badge();
    await show(score(5, 5, { kind: 'miss-streak', delta: -1 }));
    expect(text()).toBe('Your score 5 pts -1 miss streak');
    expect(badge()).not.toBe(third);
  });

  it('shows only the points actually removed at the zero floor, and no badge when none were', async () => {
    const { text, show } = await render(score(0, 3, { kind: 'second-miss', delta: -1 }));
    expect(text()).toBe('Your score 0 pts -1 two misses');

    await show(score(0, 4, { kind: 'miss-streak', delta: 0 }));
    expect(text()).toBe('Your score 0 pts');

    await show(score(0, 2, { kind: 'second-miss', delta: 0 }));
    expect(text()).toBe('Your score 0 pts');
  });
});
