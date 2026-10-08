import { describeTargeting } from './describe-targeting';

describe('describeTargeting', () => {
  it('counts the picks, then says how to fire', () => {
    expect(describeTargeting(0, 2)).toBe(
      "Pick 2 cells on the computer's board to target (0/2). Press Double Missiles again to cancel.",
    );
    expect(describeTargeting(1, 2)).toMatch(/\(1\/2\)/);
    expect(describeTargeting(2, 2)).toBe(
      'Press Click to fire both missiles. Press Double Missiles again to cancel.',
    );
    expect(describeTargeting(1, 1)).toBe(
      'Press Click to fire the missile. Press Double Missiles again to cancel.',
    );
  });
});
