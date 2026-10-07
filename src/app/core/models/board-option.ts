import type { BoardSize } from '@sinkmyship/game';

/** A selectable board choice on setup step 1. */
export interface BoardOptionDef {
  readonly id: string;
  /** Number of rows and columns; boards are square. Must be a size the rules support. */
  readonly size: BoardSize;
  /** Visible tile text, also the tile's accessible name. */
  readonly label: string;
}

/**
 * Board sizes offered in setup. `size` is typed by the rules package, so an entry for a size
 * without a fleet fails to compile.
 */
export const BOARD_OPTIONS = [
  { id: '6x6', size: 6, label: '6x6' },
  { id: '8x8', size: 8, label: '8x8' },
] as const satisfies readonly BoardOptionDef[];

export type BoardOptionId = (typeof BOARD_OPTIONS)[number]['id'];
