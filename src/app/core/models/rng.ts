import { InjectionToken } from '@angular/core';
import type { Rng } from '@sinkmyship/game';

/**
 * Randomness for the game (computer fleet placement, later the AI). Tests provide
 * `seededRng(n)` for repeatable games. Only read it in the browser so server and client
 * never render different random boards.
 */
export const RNG = new InjectionToken<Rng>('RNG', {
  providedIn: 'root',
  factory: () => Math.random,
});
