import { computed, inject, Service, signal } from '@angular/core';
import { PLAYER } from '@core/models/seats';
import type { PowerState } from '@core/models/superpowers';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerPowers } from '@core/services/player-powers/player-powers';
import { PlayerRadar } from '@core/services/player-radar/player-radar';
import { sameCoord, type Coord } from '@sinkmyship/game';

/**
 * The player's Double Missiles superpower: arming it (its block's button), picking two cells
 * on the computer's board (`PlayerTurn` routes board clicks here while armed), then firing
 * both with the Click button. The missiles are `useDoubleMissiles` from the rules package and
 * are the player's whole turn, so `PlayerTurn` fires them and ends the turn. Armed is the
 * `double-missiles` entry of `PlayerPowers`, so only one power is ever on.
 */
@Service()
export class PlayerDoubleMissiles {
  private readonly game = inject(GameStore);
  private readonly powers = inject(PlayerPowers);
  private readonly radar = inject(PlayerRadar);
  private readonly picked = signal<readonly Coord[]>([]);

  /** True after the block is pressed, until Click is pressed or the block is pressed again. */
  readonly armed = computed(() => this.powers.active() === 'double-missiles');
  /** The cells picked so far, in the order picked. Empty whenever the power isn't armed. */
  readonly targets = computed<readonly Coord[]>(() => (this.armed() ? this.picked() : []));
  /** How many targets to pick: 2, or 1 when only one cell is left. */
  readonly targetCount = computed(() => this.game.missileTargetCount(PLAYER));
  /** Whether enough targets are picked for Click to fire. */
  readonly ready = computed(
    () => this.armed() && this.targetCount() > 0 && this.targets().length === this.targetCount(),
  );

  /** How the player's Double Missiles button looks. Not while a radar scan is showing. */
  readonly state = computed<PowerState>(() => {
    if (this.armed()) return 'active';
    if (this.radar.scanning()) return 'unavailable';
    return this.game.canUseDoubleMissiles(PLAYER) ? 'ready' : 'unavailable';
  });

  /** The Double Missiles block: arms it, or, pressed again, cancels and clears the picks. */
  toggle(): void {
    if (this.armed()) {
      this.cancel();
    } else if (this.state() === 'ready') {
      this.picked.set([]);
      this.powers.select('double-missiles');
    }
  }

  /**
   * A click on the computer's board while armed: picks the cell, or unpicks it if it was
   * picked. Cells already fired at, and picks beyond `targetCount`, are ignored.
   */
  toggleTarget(at: Coord): void {
    if (!this.armed()) return;
    const picked = this.picked();
    if (picked.some((c) => sameCoord(c, at))) {
      this.picked.set(picked.filter((c) => !sameCoord(c, at)));
    } else if (picked.length < this.targetCount() && this.game.canFire(PLAYER, at)) {
      this.picked.set([...picked, { row: at.row, col: at.col }]);
    }
  }

  /** Fires at the picked cells if ready. Returns whether it fired, i.e. the turn is used up. */
  fire(): boolean {
    if (!this.ready()) return false;
    const targets = this.picked();
    this.cancel();
    if (!this.game.canUseDoubleMissiles(PLAYER)) return false;
    return this.game.useDoubleMissiles(PLAYER, targets) !== null;
  }

  private cancel(): void {
    this.picked.set([]);
    this.powers.clear();
  }
}
