import { COMPUTER, PLAYER } from '@core/models/seats';
import { describePayment } from './describe-payment';

describe('describePayment', () => {
  it('names who used which power and what it cost', () => {
    expect(describePayment({ kind: 'power', seat: PLAYER, power: 'radar', cost: 2 })).toBe(
      'You used Radar for 2 points.',
    );
    expect(describePayment({ kind: 'power', seat: COMPUTER, power: 'shield', cost: 6 })).toBe(
      'The computer used Shield for 6 points.',
    );
  });
});
