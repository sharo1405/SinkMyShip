import { computed, inject, Service } from '@angular/core';
import { RNG } from '@core/models/rng';
import { PLAYER } from '@core/models/seats';
import type { PowerState } from '@core/models/superpowers';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerPowers } from '@core/services/player-powers/player-powers';
import { PlayerRadar } from '@core/services/player-radar/player-radar';

/**
 * The player's Shotgun superpower: arming it (its block's button), then firing the
 * volley with the red Click button. The volley is `useShotgun` from the rules package and
 * is the player's whole turn, so `PlayerTurn` fires it and ends the turn. Armed is the
 * `shotgun` entry of `PlayerPowers`, so it and the Radar are never both on.
 */
@Service()
export class PlayerShotgun {
  private readonly game = inject(GameStore);
  private readonly rng = inject(RNG);
  private readonly powers = inject(PlayerPowers);
  private readonly radar = inject(PlayerRadar);

  /** True after the block is pressed, until Click is pressed or the block is pressed again. */
  readonly armed = computed(() => this.powers.active() === 'shotgun');

  /** How the player's Shotgun button looks. Not while a radar scan is showing. */
  readonly state = computed<PowerState>(() => {
    if (this.armed()) return 'active';
    if (this.radar.scanning()) return 'unavailable';
    return this.game.canUseShotgun(PLAYER) ? 'ready' : 'unavailable';
  });

  /** The Shotgun block: arms it, or, pressed again while armed, cancels without firing. */
  toggle(): void {
    if (this.armed()) {
      this.powers.clear();
    } else if (this.state() === 'ready') {
      this.powers.select('shotgun');
    }
  }

  /** Fires the volley if armed. Returns whether it fired, i.e. whether the turn is used up. */
  fire(): boolean {
    if (!this.armed()) return false;
    this.powers.clear();
    if (!this.game.canUseShotgun(PLAYER)) return false;
    return this.game.useShotgun(PLAYER, this.rng) !== null;
  }
}
