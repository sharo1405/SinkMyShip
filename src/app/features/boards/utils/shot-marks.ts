import { isShipSunk, shipAt, type Board, type Coord, type OpponentView } from '@sinkmyship/game';

/** Cells to draw as a miss, a hit, or part of a sunk ship. */
export interface ShotMarks {
  readonly miss: readonly Coord[];
  readonly hit: readonly Coord[];
  readonly sunk: readonly Coord[];
}

export const NO_SHOTS: ShotMarks = { miss: [], hit: [], sunk: [] };

/** Every cell covered by a ship on `board`. */
export function shipCells(board: Readonly<Board> | null): readonly Coord[] {
  return board?.ships.flatMap((s) => s.cells) ?? [];
}

/** Shot results on the player's own board, which the player may see in full. */
export function ownShotMarks(board: Readonly<Board> | null): ShotMarks {
  if (!board) return NO_SHOTS;
  const marks = { miss: [] as Coord[], hit: [] as Coord[], sunk: [] as Coord[] };
  for (const shot of board.shots) {
    const ship = shipAt(board, shot);
    marks[!ship ? 'miss' : isShipSunk(board, ship) ? 'sunk' : 'hit'].push(shot);
  }
  return marks;
}

/** Shot results on the opponent's board, from what the player is allowed to know. */
export function enemyShotMarks(view: OpponentView | null): ShotMarks {
  if (!view) return NO_SHOTS;
  const marks = { miss: [] as Coord[], hit: [] as Coord[], sunk: [] as Coord[] };
  view.cells.forEach((cells, row) =>
    cells.forEach((cell, col) => {
      if (cell !== 'unknown') marks[cell].push({ row, col });
    }),
  );
  return marks;
}
