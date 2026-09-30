/**
 * Whatever plays one seat's battle turns: the local player (`PlayerTurn`), the computer
 * (`ComputerPlayer`), later a network opponent. `MatchController` only talks to this.
 */
export interface SeatController {
  /** Takes the turn: fire (or run out of time), then call `onDone` exactly once. */
  start(onDone: () => void): void;
  /** Abandons the turn without calling `onDone`, e.g. when the game is left. */
  stop(): void;
}
