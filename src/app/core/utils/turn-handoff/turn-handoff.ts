/**
 * The "I'm finished" callback a side receives when its placement or turn starts. `finish()`
 * calls it at most once, so a shot and a timeout arriving together can't end a turn twice;
 * `cancel()` drops it when the game is stopped.
 */
export class TurnHandoff {
  private onDone: (() => void) | null = null;

  begin(onDone: () => void): void {
    this.onDone = onDone;
  }

  finish(): void {
    const done = this.onDone;
    this.onDone = null;
    done?.();
  }

  cancel(): void {
    this.onDone = null;
  }
}
