import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import type { PowerState } from '@core/models/superpowers';
import { PLAYER } from '@core/models/seats';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerPowers } from '@core/services/player-powers/player-powers';
import { RADAR_REVEAL_MS, type Coord, type RadarScan } from '@sinkmyship/game';

/**
 * The player's Radar superpower: aiming it, scanning a cell's row and column on the
 * computer's board, and showing what the scan found for `RADAR_REVEAL_MS`. The rules (on the
 * player's own turn, `RADAR_USES_PER_GAME` uses) are `canUseRadar`/`useRadar` in the rules
 * package. Using the radar doesn't end the turn; `PlayerTurn` routes clicks here while aiming
 * and blocks firing while a scan is showing. The radar can be aimed again once that ends.
 * Aiming is the `radar` entry of `PlayerPowers`, so it and another power are never both on.
 */
@Service()
export class PlayerRadar {
  private readonly game = inject(GameStore);
  private readonly powers = inject(PlayerPowers);
  private readonly scanState = signal<RadarScan | null>(null);
  private reveal: ReturnType<typeof setTimeout> | null = null;

  /** True after the Radar button is pressed, until a cell is picked or it is pressed again. */
  readonly aiming = computed(() => this.powers.active() === 'radar');
  /** The scan being shown, for `RADAR_REVEAL_MS` after it is made. */
  readonly scan = this.scanState.asReadonly();
  readonly scanning = computed(() => this.scanState() !== null);

  /** How the player's Radar button looks. */
  readonly state = computed<PowerState>(() => {
    if (this.aiming()) return 'active';
    if (this.scanning()) return 'unavailable';
    return this.game.canUseRadar(PLAYER) ? 'ready' : 'unavailable';
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /**
   * The Radar button: starts aiming, or, pressed again while aiming, cancels without
   * scanning. Pressing it again is the only way to cancel.
   */
  toggleAiming(): void {
    if (this.aiming()) {
      this.powers.clear();
    } else if (this.state() === 'ready') {
      this.powers.select('radar');
    }
  }

  /** Scans the row and column of `at` on the computer's board, if aiming. */
  scanAt(at: Coord): void {
    if (!this.aiming()) return;
    this.powers.clear();
    if (!this.game.canUseRadar(PLAYER)) return;
    const scan = this.game.useRadar(PLAYER, at);
    if (!scan) return;
    this.scanState.set(scan);
    this.reveal = setTimeout(() => {
      this.reveal = null;
      this.scanState.set(null);
    }, RADAR_REVEAL_MS);
  }

  /** Cancels aiming and clears any scan being shown, e.g. when the turn or the game ends. */
  stop(): void {
    if (this.reveal !== null) clearTimeout(this.reveal);
    this.reveal = null;
    if (this.aiming()) this.powers.clear();
    this.scanState.set(null);
  }
}
