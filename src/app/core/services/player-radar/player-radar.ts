import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import type { PowerState } from '@core/models/superpowers';
import { PLAYER } from '@core/models/seats';
import { GameStore } from '@core/services/game-store/game-store';
import { RADAR_REVEAL_MS, type Coord, type RadarScan } from '@sinkmyship/game';

/**
 * The player's Radar superpower: aiming it, scanning a cell's row and column on the
 * computer's board, and showing what the scan found for `RADAR_REVEAL_MS`. The rules (on the
 * player's own turn, `RADAR_USES_PER_GAME` uses) are `canUseRadar`/`useRadar` in the rules
 * package. Using the radar doesn't end the turn; `PlayerTurn` routes clicks here while aiming
 * and blocks firing while a scan is showing. The radar can be aimed again once that ends.
 */
@Service()
export class PlayerRadar {
  private readonly game = inject(GameStore);
  private readonly aimingState = signal(false);
  private readonly scanState = signal<RadarScan | null>(null);
  private reveal: ReturnType<typeof setTimeout> | null = null;

  /** True after the Radar button is pressed, until a cell is picked or it is pressed again. */
  readonly aiming = this.aimingState.asReadonly();
  /** The scan being shown, for `RADAR_REVEAL_MS` after it is made. */
  readonly scan = this.scanState.asReadonly();
  readonly scanning = computed(() => this.scanState() !== null);

  /** How the player's Radar button looks. */
  readonly state = computed<PowerState>(() => {
    if (this.aimingState()) return 'active';
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
    if (this.aimingState()) {
      this.aimingState.set(false);
    } else if (this.state() === 'ready') {
      this.aimingState.set(true);
    }
  }

  /** Scans the row and column of `at` on the computer's board, if aiming. */
  scanAt(at: Coord): void {
    if (!this.aimingState()) return;
    this.aimingState.set(false);
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
    this.aimingState.set(false);
    this.scanState.set(null);
  }
}
