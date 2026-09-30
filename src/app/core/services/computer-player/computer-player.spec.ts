import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RNG } from '@core/models/rng';
import { COMPUTER, PLAYER } from '@core/models/seats';
import { isFleetComplete, seededRng, type Coord } from '@sinkmyship/game';
import { ComputerPlayer } from './computer-player';
import { GameStore } from '@core/services/game-store/game-store';

const at = (row: number, col: number): Coord => ({ row, col });

describe('ComputerPlayer', () => {
  let game: GameStore;
  let computer: ComputerPlayer;
  let done: Mock<() => void>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    TestBed.configureTestingModule({ providers: [{ provide: RNG, useValue: seededRng(1) }] });
    game = TestBed.inject(GameStore);
    computer = TestBed.inject(ComputerPlayer);
    done = vi.fn<() => void>();
    game.newGame(4);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Both fleets placed and the player's first turn skipped, so the computer is up. */
  const computersTurn = () => {
    computer.placeFleet();
    game.placeFleetRandomly(PLAYER, seededRng(5));
    game.startBattle();
    game.passTurn(PLAYER);
  };

  it('places its whole fleet at random', () => {
    computer.placeFleet();
    const board = game.computerBoard();
    expect(board && isFleetComplete(board)).toBe(true);
    expect(game.playerBoard()?.ships).toEqual([]);
  });

  it('fires three seconds into its turn, then hands the turn back', () => {
    computersTurn();
    computer.start(done);

    vi.advanceTimersByTime(2_999);
    expect(game.playerBoard()?.shots).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(game.playerBoard()?.shots.length).toBe(1);
    expect(game.turn()).toBe(PLAYER);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('aims next to its hit on the following turn', () => {
    computersTurn();
    const target = game.playerBoard()?.ships[0]?.cells[0] ?? at(0, 0);
    // Pretend the computer already hit `target` on an earlier turn.
    game.passTurn(COMPUTER);
    game.passTurn(PLAYER);
    game.fire(COMPUTER, target);
    game.passTurn(PLAYER);

    computer.start(done);
    vi.advanceTimersByTime(3_000);

    const shot = game.playerBoard()?.shots.at(-1);
    const distance =
      Math.abs((shot?.row ?? 0) - target.row) + Math.abs((shot?.col ?? 0) - target.col);
    expect(distance).toBe(1);
  });

  it('does not fire once stopped', () => {
    computersTurn();
    computer.start(done);
    computer.stop();

    vi.advanceTimersByTime(10_000);
    expect(game.playerBoard()?.shots).toEqual([]);
    expect(done).not.toHaveBeenCalled();
  });
});
