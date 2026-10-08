import { PLAYER } from '@core/models/seats';
import type { LogEntry } from '@sinkmyship/game';

type ShotEntry = Extract<LogEntry, { kind: 'shot' }>;

/**
 * The Random shots volley at the end of the log, if the latest turn was one: the trailing
 * shots fired by `random-shots`, all by the same seat. A volley is a whole turn, so the
 * previous turn's entries always belong to the other seat or to a different action.
 */
export function lastVolley(log: readonly LogEntry[]): readonly ShotEntry[] | null {
  const last = log.at(-1);
  if (last?.kind !== 'shot' || last.power !== 'random-shots') return null;
  const volley: ShotEntry[] = [];
  for (let i = log.length - 1; i >= 0; i--) {
    const entry = log[i];
    if (entry?.kind !== 'shot' || entry.power !== 'random-shots' || entry.seat !== last.seat) {
      break;
    }
    volley.unshift(entry);
  }
  return volley;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One line for a volley, e.g. "Random shots: 2 hits, 3 misses. You sank a 3-block ship!" */
export function describeVolley(volley: readonly ShotEntry[]): string {
  const mine = volley[0]?.seat === PLAYER;
  const hits = volley.filter((s) => s.outcome.kind !== 'miss').length;
  const misses = volley.length - hits;
  const sunk = volley.flatMap((s) => (s.outcome.kind === 'sunk' ? [s.outcome.length] : []));
  const sinks = sunk.map((length) =>
    mine ? ` You sank a ${length}-block ship!` : ` The computer sank your ${length}-block ship.`,
  );
  const who = mine ? 'Random shots' : "The computer's random shots";
  return `${who}: ${plural(hits, 'hit', 'hits')}, ${plural(misses, 'miss', 'misses')}.${sinks.join('')}`;
}
