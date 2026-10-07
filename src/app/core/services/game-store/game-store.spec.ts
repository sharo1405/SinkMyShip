import { TestBed } from '@angular/core/testing';
import { COMPUTER, PLAYER } from '@core/models/seats';
import { isFleetComplete, seededRng, type Coord } from '@sinkmyship/game';
import { GameStore } from './game-store';

const at = (row: number, col: number): Coord => ({ row, col });

describe('GameStore', () => {
  let store: GameStore;

  beforeEach(() => {
    store = TestBed.inject(GameStore);
    store.newGame(6);
  });

  /** Places both 6x6 fleets: 2-block on A1-B1, 3-block on A3-C3, 4-block on A5-D5. */
  const placeBothFleets = () => {
    for (const seat of [PLAYER, COMPUTER]) {
      store.placeShip(seat, { id: 'ship-1', length: 2 }, [at(0, 0), at(0, 1)]);
      store.placeShip(seat, { id: 'ship-2', length: 3 }, [at(2, 0), at(2, 1), at(2, 2)]);
      store.placeShip(seat, { id: 'ship-3', length: 4 }, [at(4, 0), at(4, 1), at(4, 2), at(4, 3)]);
    }
  };

  it('starts a placing game with two empty boards and the fleet for the size', () => {
    expect(store.phase()).toBe('placing');
    expect(store.playerBoard()?.ships).toEqual([]);
    expect(store.computerBoard()?.ships).toEqual([]);
    expect(store.fleet().map((s) => s.length)).toEqual([2, 3, 4]);
  });

  it('commits every change as a new state, so signals notify', () => {
    const before = store.playerBoard();
    store.placeShip(PLAYER, { id: 'ship-1', length: 2 }, [at(0, 0), at(0, 1)]);
    expect(store.playerBoard()).not.toBe(before);
    expect(store.placedShipIds().has('ship-1')).toBe(true);

    store.removeShip(PLAYER, 'ship-1');
    expect(store.placedShipIds().size).toBe(0);
  });

  it('fills a fleet at random and allows the battle once both are complete', () => {
    store.placeFleetRandomly(PLAYER, seededRng(1));
    const board = store.playerBoard();
    expect(board && isFleetComplete(board)).toBe(true);
    expect(store.canStartBattle()).toBe(false);

    store.placeFleetRandomly(COMPUTER, seededRng(2));
    expect(store.canStartBattle()).toBe(true);
    store.startBattle();
    expect(store.phase()).toBe('battle');
    expect(store.turn()).toBe(PLAYER);
  });

  it('fires, passes turns, and shows each side only what it may know', () => {
    placeBothFleets();
    expect(store.isTurnOf(PLAYER)).toBe(false);
    store.startBattle();
    expect(store.isTurnOf(PLAYER)).toBe(true);

    expect(store.canFire(COMPUTER, at(3, 3))).toBe(false);
    store.fire(PLAYER, at(0, 0));
    expect(store.enemyView()?.cells[0]?.[0]).toBe('hit');
    expect(store.enemyView()?.cells[0]?.[1]).toBe('unknown');
    expect(store.turn()).toBe(COMPUTER);
    expect(store.isTurnOf(COMPUTER)).toBe(true);

    store.passTurn(COMPUTER);
    expect(store.turn()).toBe(PLAYER);
    expect(store.canFire(PLAYER, at(0, 0))).toBe(false);
    expect(
      store
        .computerView()
        ?.cells.flat()
        .every((c) => c === 'unknown'),
    ).toBe(true);
    expect(store.log().map((e) => e.kind)).toEqual(['shot', 'timeout']);
  });
});
