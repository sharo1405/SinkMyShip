import { coordLabel, type RadarScan } from '@sinkmyship/game';

/** What a radar scan found, e.g. "Radar: 3 ship squares in row 4 and column D." */
export function describeRadar(scan: RadarScan): string {
  const count = scan.found.length;
  const label = coordLabel(scan.at);
  const column = label.slice(0, 1);
  const row = label.slice(1);
  return `Radar: ${count} ship ${count === 1 ? 'square' : 'squares'} in row ${row} and column ${column}.`;
}
