import { COMPUTER, PLAYER } from '@core/models/seats';
import { describeBlocked } from './describe-blocked';

describe('describeBlocked', () => {
  it('tells the player whose shield blocked whose shot', () => {
    const at = { row: 0, col: 0 };
    expect(describeBlocked({ kind: 'blocked', seat: COMPUTER, at })).toBe(
      "Your shield blocked the computer's shot!",
    );
    expect(describeBlocked({ kind: 'blocked', seat: PLAYER, at })).toBe(
      "The computer's shield blocked your shot.",
    );
  });
});
