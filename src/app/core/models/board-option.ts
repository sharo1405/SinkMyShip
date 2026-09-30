/** A selectable board choice on setup step 1. */
export interface BoardOptionDef {
  readonly id: string;
  /** Accessible name; the tiles themselves are unlabelled squares. */
  readonly label: string;
}

/**
 * Placeholder board choices. Real board sizes aren't decided yet; when they are, the sizes
 * belong in the `src/game` rules package and these entries should point at them.
 */
export const BOARD_OPTIONS = [
  { id: 'option-1', label: 'Board option 1' },
  { id: 'option-2', label: 'Board option 2' },
  { id: 'option-3', label: 'Board option 3' },
] as const satisfies readonly BoardOptionDef[];

export type BoardOptionId = (typeof BOARD_OPTIONS)[number]['id'];
