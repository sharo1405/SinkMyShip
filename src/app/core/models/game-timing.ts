import { InjectionToken } from '@angular/core';

/** How long the computer waits after its turn starts before it fires. Tests shorten it. */
export const COMPUTER_SHOT_DELAY_MS = new InjectionToken<number>('COMPUTER_SHOT_DELAY_MS', {
  providedIn: 'root',
  factory: () => 3000,
});
