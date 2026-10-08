import { PLAYER } from '@core/models/seats';
import { SUPERPOWERS } from '@core/models/superpowers';
import type { LogEntry, SuperpowerId } from '@sinkmyship/game';

type ShotEntry = Extract<LogEntry, { kind: 'shot' }>;

/** The shots a superpower fired in one turn (Shotgun, Double Missiles). */
export interface Volley {
  readonly power: SuperpowerId;
  readonly shots: readonly ShotEntry[];
}

/**
 * The volley at the end of the log, if the latest turn was one: the trailing shots fired by
 * the same superpower, all by the same seat, looking past the payment logged after them. A
 * volley is a whole turn, so the previous turn's entries always belong to the other seat or
 * to a different action.
 */
export function lastVolley(log: readonly LogEntry[]): Volley | null {
  const paid = log.at(-1)?.kind === 'power' ? 1 : 0;
  const last = log.at(-1 - paid);
  if (last?.kind !== 'shot' || !last.power) return null;
  const shots: ShotEntry[] = [];
  for (let i = log.length - 1 - paid; i >= 0; i--) {
    const entry = log[i];
    if (entry?.kind !== 'shot' || entry.power !== last.power || entry.seat !== last.seat) {
      break;
    }
    shots.unshift(entry);
  }
  return { power: last.power, shots };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One line for a volley, e.g. "Shotgun: 2 hits, 3 misses. You sank a 3-block ship!" */
export function describeVolley({ power, shots }: Volley): string {
  const mine = shots[0]?.seat === PLAYER;
  const hits = shots.filter((s) => s.outcome.kind !== 'miss').length;
  const misses = shots.length - hits;
  const sunk = shots.flatMap((s) => (s.outcome.kind === 'sunk' ? [s.outcome.length] : []));
  const sinks = sunk.map((length) =>
    mine ? ` You sank a ${length}-block ship!` : ` The computer sank your ${length}-block ship.`,
  );
  const label = SUPERPOWERS.find((p) => p.id === power)?.label ?? power;
  const who = mine ? label : `The computer's ${label}`;
  return `${who}: ${plural(hits, 'hit', 'hits')}, ${plural(misses, 'miss', 'misses')}.${sinks.join('')}`;
}
