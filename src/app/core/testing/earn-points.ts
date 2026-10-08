import { COMPUTER, PLAYER } from '@core/models/seats';
import type { GameStore } from '@core/services/game-store/game-store';
import { shipAt, wasShot, type Coord } from '@sinkmyship/game';

/**
 * Test helper: lets the player earn score points with real shots, so specs can pay for
 * superpowers. Each round the player hits one of the computer's ship squares, taken from the
 * bottom-right corner (away from the top-left cells specs usually aim at), and the computer
 * loses its turn to the clock, which marks nothing on the player's board.
 *
 * Starts and ends on the player's turn. Three rounds earn 6 points (+1, +1, +4).
 */
export function earnPoints(game: GameStore, rounds = 3): void {
  const board = game.computerBoard();
  if (!board) throw new Error('No game');
  const targets: Coord[] = [];
  for (let row = board.size - 1; row >= 0; row--) {
    for (let col = board.size - 1; col >= 0; col--) {
      const at = { row, col };
      if (shipAt(board, at) && !wasShot(board, at)) targets.push(at);
    }
  }
  for (let round = 0; round < rounds; round++) {
    const at = targets[round];
    if (!at) throw new Error('Not enough ship squares left to earn points');
    game.fire(PLAYER, at);
    game.passTurn(COMPUTER);
  }
}
