import { PLAYER } from '@core/models/seats';
import { SUPERPOWERS } from '@core/models/superpowers';
import type { LogEntry } from '@sinkmyship/game';

type PaymentEntry = Extract<LogEntry, { kind: 'power' }>;

/** One line for a superpower paid for with score points, e.g. "You used Radar for 2 points." */
export function describePayment(entry: PaymentEntry): string {
  const name = SUPERPOWERS.find((p) => p.id === entry.power)?.label ?? entry.power;
  const who = entry.seat === PLAYER ? 'You' : 'The computer';
  return `${who} used ${name} for ${entry.cost} points.`;
}
