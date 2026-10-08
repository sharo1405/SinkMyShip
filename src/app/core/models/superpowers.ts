import type { SuperpowerId } from '@sinkmyship/game';

/** A superpower's display data. Its rules live in `@sinkmyship/game`. */
export interface SuperpowerDef {
  readonly id: SuperpowerId;
  /** Visible block text, also its accessible name. */
  readonly label: string;
  /**
   * A button shown under the block while the power is active, which carries it out (e.g.
   * Random shots' red "Click"). `name` is its accessible name and contains `label`.
   */
  readonly action?: { readonly label: string; readonly name: string };
}

/** The four superpowers, in display order (the same order as `SUPERPOWER_IDS`). */
export const SUPERPOWERS = [
  { id: 'radar', label: 'Radar' },
  {
    id: 'random-shots',
    label: 'Random shots',
    action: { label: 'Click', name: 'Click to fire random shots' },
  },
  { id: 'double-missiles', label: 'Double Missiles' },
  { id: 'shield', label: 'Shield' },
] as const satisfies readonly SuperpowerDef[];

/**
 * How a usable superpower's button looks: `ready` to use, `active` while it's being aimed,
 * `unavailable` for now (not this side's turn, or a result is still showing).
 */
export type PowerState = 'ready' | 'active' | 'unavailable';
