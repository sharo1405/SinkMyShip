import { POWER_PRICES, type SuperpowerId } from '@sinkmyship/game';

/** A superpower's display data. Its rules live in `@sinkmyship/game`. */
export interface SuperpowerDef {
  readonly id: SuperpowerId;
  /** Visible block text, also its accessible name. */
  readonly label: string;
  /** Score points each use costs (`POWER_PRICES` in the rules), shown on the block. */
  readonly price: number;
  /**
   * A button shown under the block while the power is active, which carries it out (e.g.
   * the Shotgun's red "Click"). `name` is its accessible name and contains `label`.
   */
  readonly action?: { readonly label: string; readonly name: string };
}

/** The four superpowers, in display order (the same order as `SUPERPOWER_IDS`). */
export const SUPERPOWERS = [
  { id: 'radar', label: 'Radar', price: POWER_PRICES.radar },
  {
    id: 'shotgun',
    label: 'Shotgun',
    price: POWER_PRICES.shotgun,
    action: { label: 'Click', name: 'Click to fire the Shotgun' },
  },
  {
    id: 'double-missiles',
    label: 'Double Missiles',
    price: POWER_PRICES['double-missiles'],
    action: { label: 'Click', name: 'Click to fire Double Missiles' },
  },
  { id: 'shield', label: 'Shield', price: POWER_PRICES.shield },
] as const satisfies readonly SuperpowerDef[];

/**
 * How a usable superpower's button looks: `ready` to use, `active` while it's being aimed
 * (press again to cancel), `on` while its effect lasts (pressed look, but disabled: there's
 * nothing to cancel), `unavailable` for now (not this side's turn, or a result showing).
 */
export type PowerState = 'ready' | 'active' | 'on' | 'unavailable';
