import { PLAYER } from '@core/models/seats';
import { coordLabel, type LogEntry } from '@sinkmyship/game';

/** One line describing a turn from the game log, from the player's point of view. */
export function describeTurn(entry: LogEntry): string {
  if (entry.kind === 'timeout') {
    return entry.seat === PLAYER
      ? 'Time ran out, your turn was skipped.'
      : 'The computer ran out of time.';
  }
  const mine = entry.seat === PLAYER;
  const cell = coordLabel(entry.at);
  const outcome = entry.outcome;
  switch (outcome.kind) {
    case 'miss':
      return mine ? `You missed at ${cell}.` : `The computer missed at ${cell}.`;
    case 'hit':
      return mine ? `You hit a ship at ${cell}!` : `The computer hit your ship at ${cell}.`;
    case 'sunk':
      return mine
        ? `You sank a ${outcome.length}-block ship!`
        : `The computer sank your ${outcome.length}-block ship.`;
    default: {
      const exhaustive: never = outcome;
      throw new Error(`Unhandled outcome ${String(exhaustive)}`);
    }
  }
}
