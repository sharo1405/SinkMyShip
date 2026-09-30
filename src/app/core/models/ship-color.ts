/** A cosmetic fleet colour the player picks on setup step 2. */
export interface ShipColorDef {
  readonly id: string;
  readonly label: string;
  /** CSS colour value; points at a theme token in `styles.scss`. */
  readonly value: string;
}

export const SHIP_COLORS = [
  { id: 'blue', label: 'Blue', value: 'var(--ship-blue)' },
  { id: 'green', label: 'Green', value: 'var(--ship-green)' },
  { id: 'purple', label: 'Purple', value: 'var(--ship-purple)' },
] as const satisfies readonly ShipColorDef[];

export type ShipColorId = (typeof SHIP_COLORS)[number]['id'];
