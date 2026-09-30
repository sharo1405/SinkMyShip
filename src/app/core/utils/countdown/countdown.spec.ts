import { Countdown } from './countdown';

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down, calls back once when time is up, then stops', () => {
    const countdown = new Countdown(true);
    const timeUp = vi.fn();
    countdown.start(10_000, timeUp);
    expect(countdown.timeLeftMs()).toBe(10_000);

    vi.advanceTimersByTime(4_000);
    expect(countdown.timeLeftMs()).toBe(6_000);
    expect(timeUp).not.toHaveBeenCalled();

    vi.advanceTimersByTime(6_000);
    expect(timeUp).toHaveBeenCalledTimes(1);
    expect(countdown.timeLeftMs()).toBeNull();

    vi.advanceTimersByTime(60_000);
    expect(timeUp).toHaveBeenCalledTimes(1);
  });

  it('restarts from the full duration and can be stopped early', () => {
    const countdown = new Countdown(true);
    const timeUp = vi.fn();
    countdown.start(10_000, timeUp);
    vi.advanceTimersByTime(8_000);

    countdown.start(10_000, timeUp);
    expect(countdown.timeLeftMs()).toBe(10_000);

    countdown.stop();
    vi.advanceTimersByTime(60_000);
    expect(timeUp).not.toHaveBeenCalled();
    expect(countdown.timeLeftMs()).toBeNull();
  });

  it('never runs when disabled (on the server)', () => {
    const countdown = new Countdown(false);
    const timeUp = vi.fn();
    countdown.start(1_000, timeUp);

    vi.advanceTimersByTime(60_000);
    expect(countdown.timeLeftMs()).toBeNull();
    expect(timeUp).not.toHaveBeenCalled();
  });
});
