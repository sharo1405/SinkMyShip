import { computed, inject, Service } from '@angular/core';
import { RNG } from '@core/models/rng';
import { PLAYER } from '@core/models/seats';
import type { PowerState } from '@core/models/superpowers';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerPowers } from '@core/services/player-powers/player-powers';
import { PlayerRadar } from '@core/services/player-radar/player-radar';

/**
 * The player's Random shots superpower: arming it (its block's button), then firing the
 * volley with the red Click button. The volley is `useRandomShots` from the rules package and
 * is the player's whole turn, so `PlayerTurn` fires it and ends the turn. Armed is the
 * `random-shots` entry of `PlayerPowers`, so it and the Radar are never both on.
 */
@Service()
export class PlayerRandomShots {
  private readonly game = inject(GameStore);
  private readonly rng = inject(RNG);
  private readonly powers = inject(PlayerPowers);
  private readonly radar = inject(PlayerRadar);

  /** True after the block is pressed, until Click is pressed or the block is pressed again. */
  readonly armed = computed(() => this.powers.active() === 'random-shots');

  /** How the player's Random shots button looks. Not while a radar scan is showing. */
  readonly state = computed<PowerState>(() => {
    if (this.armed()) return 'active';
    if (this.radar.scanning()) return 'unavailable';
    return this.game.canUseRandomShots(PLAYER) ? 'ready' : 'unavailable';
  });

  /** The Random shots block: arms it, or, pressed again while armed, cancels without firing. */
  toggle(): void {
    if (this.armed()) {
      this.powers.clear();
    } else if (this.state() === 'ready') {
      this.powers.select('random-shots');
    }
  }

  /** Fires the volley if armed. Returns whether it fired, i.e. whether the turn is used up. */
  fire(): boolean {
    if (!this.armed()) return false;
    this.powers.clear();
    if (!this.game.canUseRandomShots(PLAYER)) return false;
    return this.game.useRandomShots(PLAYER, this.rng) !== null;
  }
}
