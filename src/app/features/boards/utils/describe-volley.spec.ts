import type { LogEntry, Seat, ShotOutcome, SuperpowerId } from '@sinkmyship/game';
import { describeVolley, lastVolley } from './describe-volley';

const shot = (seat: Seat, outcome: ShotOutcome, power?: SuperpowerId): LogEntry => ({
  kind: 'shot',
  seat,
  at: { row: 0, col: 0 },
  outcome,
  ...(power ? { power } : {}),
});
const MISS: ShotOutcome = { kind: 'miss' };
const HIT: ShotOutcome = { kind: 'hit', shipId: 'ship-2' };
const SUNK: ShotOutcome = { kind: 'sunk', shipId: 'ship-1', length: 2 };

describe('lastVolley', () => {
  it("is the trailing power shots of the latest turn's seat, or null after a normal turn", () => {
    expect(lastVolley([])).toBeNull();
    expect(lastVolley([shot(0, MISS, 'shotgun'), shot(1, HIT)])).toBeNull();

    const shots = [shot(0, HIT, 'shotgun'), shot(0, MISS, 'shotgun'), shot(0, SUNK, 'shotgun')];
    expect(lastVolley([shot(0, MISS), shot(1, MISS), ...shots])).toEqual({
      power: 'shotgun',
      shots,
    });
  });

  it('keeps volleys of different powers apart', () => {
    const missiles = [shot(0, HIT, 'double-missiles'), shot(0, MISS, 'double-missiles')];
    expect(lastVolley([shot(0, MISS, 'shotgun'), shot(1, MISS), ...missiles])).toEqual({
      power: 'double-missiles',
      shots: missiles,
    });
  });
});

describe('describeVolley', () => {
  it('names the power, counts hits (sunk included) and misses, and mentions each sunk ship', () => {
    const shotgun = [HIT, MISS, SUNK, MISS, MISS].map((o) => shot(0, o, 'shotgun'));
    expect(describeVolley(lastVolley(shotgun) ?? { power: 'shotgun', shots: [] })).toBe(
      'Shotgun: 2 hits, 3 misses. You sank a 2-block ship!',
    );
    const missiles = [shot(0, HIT, 'double-missiles'), shot(0, MISS, 'double-missiles')];
    expect(describeVolley(lastVolley(missiles) ?? { power: 'double-missiles', shots: [] })).toBe(
      'Double Missiles: 1 hit, 1 miss.',
    );
  });
});
