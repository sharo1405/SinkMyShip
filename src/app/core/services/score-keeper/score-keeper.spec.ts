import { TestBed } from '@angular/core/testing';
import { COMPUTER, PLAYER } from '@core/models/seats';
import { GameStore } from '@core/services/game-store/game-store';
import { INITIAL_SCORE, type Coord } from '@sinkmyship/game';
import { ScoreKeeper } from './score-keeper';

const at = (row: number, col: number): Coord => ({ row, col });

describe('ScoreKeeper', () => {
  let store: GameStore;
  let scores: ScoreKeeper;

  /** A 6x6 battle where both fleets sit on A1-B1, A3-C3 and A5-D5. */
  const startBattle = () => {
    store.newGame(6);
    for (const seat of [PLAYER, COMPUTER]) {
      store.placeShip(seat, { id: 'ship-1', length: 2 }, [at(0, 0), at(0, 1)]);
      store.placeShip(seat, { id: 'ship-2', length: 3 }, [at(2, 0), at(2, 1), at(2, 2)]);
      store.placeShip(seat, { id: 'ship-3', length: 4 }, [at(4, 0), at(4, 1), at(4, 2), at(4, 3)]);
    }
    store.startBattle();
  };

  beforeEach(() => {
    store = TestBed.inject(GameStore);
    scores = TestBed.inject(ScoreKeeper);
  });

  it('is zero for both sides before any game and in a new one', () => {
    expect(scores.player()).toEqual(INITIAL_SCORE);
    startBattle();
    expect(scores.player()).toEqual(INITIAL_SCORE);
    expect(scores.computer()).toEqual(INITIAL_SCORE);
  });

  it("scores each side's own shots: +4 on a third hit in a row, misses down to 0 at most", () => {
    startBattle();
    store.fire(PLAYER, at(0, 0));
    store.fire(COMPUTER, at(5, 5));
    store.fire(PLAYER, at(0, 1));
    store.fire(COMPUTER, at(5, 4));
    store.fire(PLAYER, at(2, 0));

    expect(scores.player().points).toBe(1 + 1 + 4);
    expect(scores.player().last).toEqual({ kind: 'hit-streak', delta: 4 });
    // The computer has no points to lose, so its misses stop at the zero floor.
    expect(scores.computer().points).toBe(0);
    expect(scores.computer().last).toEqual({ kind: 'second-miss', delta: 0 });

    store.fire(COMPUTER, at(0, 0));
    store.fire(PLAYER, at(5, 5));
    store.fire(COMPUTER, at(5, 3));
    store.fire(PLAYER, at(5, 4));
    expect(scores.computer().points).toBe(1);
    expect(scores.player().points).toBe(6 + 0 - 2);
    expect(scores.player().last).toEqual({ kind: 'second-miss', delta: -2 });

    store.fire(COMPUTER, at(5, 2));
    expect(scores.computer().points).toBe(0);
    expect(scores.computer().last).toEqual({ kind: 'second-miss', delta: -1 });
  });

  it('starts over when a new game begins', () => {
    startBattle();
    store.fire(PLAYER, at(0, 0));
    expect(scores.player().points).toBe(1);

    store.newGame(6);
    expect(scores.player()).toEqual(INITIAL_SCORE);
  });
});
