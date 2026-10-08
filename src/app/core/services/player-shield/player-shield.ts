import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import { COMPUTER, PLAYER } from '@core/models/seats';
import type { PowerState } from '@core/models/superpowers';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerPowers } from '@core/services/player-powers/player-powers';

/** How long the player's board flashes red after the shield blocks a shot. */
export const SHIELD_ALERT_MS = 800;

/**
 * The player's Shield superpower. One press raises it (`useShield` in the rules package):
 * there is no aiming and no cancel, and it doesn't use the turn. It blocks the computer's
 * next shot, and then the player's board flashes red for `SHIELD_ALERT_MS`.
 */
@Service()
export class PlayerShield {
  private readonly game = inject(GameStore);
  private readonly powers = inject(PlayerPowers);
  private readonly alertingState = signal(false);
  private alertTimer: ReturnType<typeof setTimeout> | null = null;

  /** True while the player's board has a shield up. */
  readonly up = computed(() => this.game.isShielded(PLAYER));
  /** True while the board flashes after a blocked shot. */
  readonly alerting = this.alertingState.asReadonly();

  /** How the player's Shield button looks: `on` (disabled) while the shield is up. */
  readonly state = computed<PowerState>(() => {
    if (this.up()) return 'on';
    return this.game.canUseShield(PLAYER) ? 'ready' : 'unavailable';
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** The Shield block: raises the shield, cancelling any power being aimed. */
  activate(): void {
    if (this.state() !== 'ready') return;
    this.powers.clear();
    this.game.useShield(PLAYER);
  }

  /**
   * Called when the player's turn starts: if the computer's shot that just ended its turn
   * hit the shield, flash the board for `SHIELD_ALERT_MS`.
   */
  alertIfJustBlocked(): void {
    const last = this.game.log().at(-1);
    if (last?.kind !== 'blocked' || last.seat !== COMPUTER) return;
    this.clearAlert();
    this.alertingState.set(true);
    this.alertTimer = setTimeout(() => this.clearAlert(), SHIELD_ALERT_MS);
  }

  /** Stops any flash, e.g. when the game ends or a new one starts. */
  stop(): void {
    this.clearAlert();
  }

  private clearAlert(): void {
    if (this.alertTimer !== null) clearTimeout(this.alertTimer);
    this.alertTimer = null;
    this.alertingState.set(false);
  }
}
