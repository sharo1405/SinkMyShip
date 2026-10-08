import { Service, signal } from '@angular/core';
import type { SuperpowerId } from '@sinkmyship/game';

/**
 * Which of the player's superpowers is active (being aimed or armed), if any. Shared by the
 * power services so only one is ever active: selecting one cancels the other.
 */
@Service()
export class PlayerPowers {
  private readonly activeState = signal<SuperpowerId | null>(null);

  readonly active = this.activeState.asReadonly();

  /** Makes `power` the active one, cancelling any other. */
  select(power: SuperpowerId): void {
    this.activeState.set(power);
  }

  /** Cancels whichever power is active. */
  clear(): void {
    this.activeState.set(null);
  }
}
