import { TurnHandoff } from './turn-handoff';

describe('TurnHandoff', () => {
  it('calls the callback once, however often finish() is called', () => {
    const handoff = new TurnHandoff();
    const done = vi.fn<() => void>();
    handoff.begin(done);

    handoff.finish();
    handoff.finish();

    expect(done).toHaveBeenCalledTimes(1);
  });

  it('never calls a cancelled callback', () => {
    const handoff = new TurnHandoff();
    const done = vi.fn<() => void>();
    handoff.begin(done);

    handoff.cancel();
    handoff.finish();

    expect(done).not.toHaveBeenCalled();
  });

  it('calls only the latest callback after a restart', () => {
    const handoff = new TurnHandoff();
    const first = vi.fn<() => void>();
    const second = vi.fn<() => void>();
    handoff.begin(first);
    handoff.begin(second);

    handoff.finish();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
