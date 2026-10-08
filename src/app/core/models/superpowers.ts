import type { SuperpowerId } from '@sinkmyship/game';

/** A superpower's display data. Its rules live in `@sinkmyship/game`. */
export interface SuperpowerDef {
  readonly id: SuperpowerId;
  /** Visible block text, also its accessible name. */
  readonly label: string;
}

/** The four superpowers, in display order (the same order as `SUPERPOWER_IDS`). */
export const SUPERPOWERS = [
  { id: 'radar', label: 'Radar' },
  { id: 'random-shots', label: 'Random shots' },
  { id: 'double-missiles', label: 'Double Missiles' },
  { id: 'shield', label: 'Shield' },
] as const satisfies readonly SuperpowerDef[];

/**
 * How a usable superpower's button looks: `ready` to use, `active` while it's being aimed,
 * `unavailable` for now (not this side's turn, or a result is still showing).
 */
export type PowerState = 'ready' | 'active' | 'unavailable';
