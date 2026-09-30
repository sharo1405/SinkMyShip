import { formatClock } from './format-clock';

describe('formatClock', () => {
  it('shows minutes and zero-padded seconds, rounding up to the next whole second', () => {
    expect(formatClock(5 * 60_000)).toBe('5:00');
    expect(formatClock(4 * 60_000 + 59_200)).toBe('5:00');
    expect(formatClock(61_000)).toBe('1:01');
    expect(formatClock(9_000)).toBe('0:09');
    expect(formatClock(1)).toBe('0:01');
  });

  it('never goes below 0:00', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(-500)).toBe('0:00');
  });
});
