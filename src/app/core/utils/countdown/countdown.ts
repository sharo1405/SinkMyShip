import { computed, signal } from '@angular/core';

/** How often a running countdown refreshes. */
const TICK_MS = 250;

/**
 * A restartable countdown exposed as a signal, used for the placement and turn clocks.
 * Construct it with `enabled: false` on the server so no timer ever runs there.
 */
export class Countdown {
  private readonly deadline = signal<number | null>(null);
  private readonly now = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Time left in ms while running, else `null`. */
  readonly timeLeftMs = computed<number | null>(() => {
    const deadline = this.deadline();
    return deadline === null ? null : Math.max(0, deadline - this.now());
  });

  constructor(private readonly enabled: boolean) {}

  /** (Re)starts the countdown; `onTimeUp` runs once, after the countdown has stopped. */
  start(durationMs: number, onTimeUp: () => void): void {
    this.stop();
    if (!this.enabled) return;
    const start = Date.now();
    this.now.set(start);
    this.deadline.set(start + durationMs);
    this.timer = setInterval(() => {
      const now = Date.now();
      this.now.set(now);
      if (now >= (this.deadline() ?? Infinity)) {
        this.stop();
        onTimeUp();
      }
    }, TICK_MS);
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.deadline.set(null);
  }
}
