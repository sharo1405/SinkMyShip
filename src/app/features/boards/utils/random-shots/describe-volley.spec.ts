import type { LogEntry, Seat, ShotOutcome } from '@sinkmyship/game';
import { describeVolley, lastVolley } from './describe-volley';

const shot = (seat: Seat, outcome: ShotOutcome, random = true): LogEntry => ({
  kind: 'shot',
  seat,
  at: { row: 0, col: 0 },
  outcome,
  ...(random ? { power: 'random-shots' as const } : {}),
});
const MISS: ShotOutcome = { kind: 'miss' };
const HIT: ShotOutcome = { kind: 'hit', shipId: 'ship-2' };
const SUNK: ShotOutcome = { kind: 'sunk', shipId: 'ship-1', length: 2 };

describe('lastVolley', () => {
  it("is the trailing random shots of the latest turn's seat, or null after a normal turn", () => {
    expect(lastVolley([])).toBeNull();
    expect(lastVolley([shot(0, MISS), shot(1, HIT, false)])).toBeNull();

    const volley = [shot(0, HIT), shot(0, MISS), shot(0, SUNK)];
    expect(lastVolley([shot(0, MISS, false), shot(1, MISS, false), ...volley])).toEqual(volley);
  });
});

describe('describeVolley', () => {
  it('counts hits (sunk included) and misses, and mentions each sunk ship', () => {
    const volley = [shot(0, HIT), shot(0, MISS), shot(0, SUNK), shot(0, MISS), shot(0, MISS)];
    const entries = lastVolley(volley) ?? [];
    expect(describeVolley(entries)).toBe(
      'Random shots: 2 hits, 3 misses. You sank a 2-block ship!',
    );
    expect(describeVolley(lastVolley([shot(0, HIT)]) ?? [])).toBe('Random shots: 1 hit, 0 misses.');
  });
});
