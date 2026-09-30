/**
 * Formats a countdown as `m:ss`, rounding up so the display only reaches `0:00` when the
 * time is really gone (4:59.2 left shows `5:00`).
 */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
