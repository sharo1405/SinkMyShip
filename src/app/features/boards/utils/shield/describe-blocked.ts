import { PLAYER } from '@core/models/seats';
import type { LogEntry } from '@sinkmyship/game';

type BlockedEntry = Extract<LogEntry, { kind: 'blocked' }>;

/** One line for a shot a shield blocked, from the player's point of view. */
export function describeBlocked(entry: BlockedEntry): string {
  return entry.seat === PLAYER
    ? "The computer's shield blocked your shot."
    : "Your shield blocked the computer's shot!";
}
