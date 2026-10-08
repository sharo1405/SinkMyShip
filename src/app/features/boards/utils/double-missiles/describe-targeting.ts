/**
 * The status line while Double Missiles is armed: how many targets are picked, then how to
 * fire, e.g. "Pick 2 cells to target (1/2). Press Double Missiles again to cancel."
 */
export function describeTargeting(picked: number, needed: number): string {
  const cancel = 'Press Double Missiles again to cancel.';
  if (picked < needed) {
    const cells = needed === 1 ? '1 cell' : `${needed} cells`;
    return `Pick ${cells} on the computer's board to target (${picked}/${needed}). ${cancel}`;
  }
  const what = needed === 1 ? 'the missile' : 'both missiles';
  return `Press Click to fire ${what}. ${cancel}`;
}
