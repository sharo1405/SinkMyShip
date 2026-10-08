import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { COMPUTER, PLAYER } from '@core/models/seats';
import { RADAR_REVEAL_MS, TURN_TIME_LIMIT_MS, type Coord } from '@sinkmyship/game';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerRadar } from '@core/services/player-radar/player-radar';
import { PlayerTurn } from './player-turn';

const at = (row: number, col: number): Coord => ({ row, col });

describe('PlayerTurn', () => {
  let game: GameStore;
  let turn: PlayerTurn;
  let done: Mock<() => void>;

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'],
    });
    game = TestBed.inject(GameStore);
    turn = TestBed.inject(PlayerTurn);
    done = vi.fn<() => void>();

    // 6x6 battle with both fleets on A1-B1, A3-C3 and A5-D5; the player fires first.
    game.newGame(6);
    for (const seat of [PLAYER, COMPUTER]) {
      game.placeShip(seat, { id: 'ship-1', length: 2 }, [at(0, 0), at(0, 1)]);
      game.placeShip(seat, { id: 'ship-2', length: 3 }, [at(2, 0), at(2, 1), at(2, 2)]);
      game.placeShip(seat, { id: 'ship-3', length: 4 }, [at(4, 0), at(4, 1), at(4, 2), at(4, 3)]);
    }
    game.startBattle();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires at the computer board and ends the turn', () => {
    turn.start(done);
    expect(turn.active()).toBe(true);
    expect(turn.timeLeftMs()).toBe(TURN_TIME_LIMIT_MS);

    turn.fireAt(at(3, 3));

    expect(game.enemyView()?.cells[3]?.[3]).toBe('miss');
    expect(turn.active()).toBe(false);
    expect(turn.timeLeftMs()).toBeNull();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('rejects a cell already fired at without using the turn', () => {
    turn.start(done);
    turn.fireAt(at(3, 3));
    game.passTurn(COMPUTER);
    turn.start(done);

    turn.fireAt(at(3, 3));
    expect(turn.rejectedTarget()).toEqual(at(3, 3));
    expect(turn.active()).toBe(true);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('skips the turn when the turn clock runs out', () => {
    turn.start(done);
    vi.advanceTimersByTime(TURN_TIME_LIMIT_MS - 1_000);
    expect(done).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1_000);
    expect(game.log()).toEqual([{ kind: 'timeout', seat: PLAYER }]);
    expect(game.turn()).toBe(COMPUTER);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('scans instead of firing while the radar is aimed, and keeps the turn', () => {
    const radar = TestBed.inject(PlayerRadar);
    turn.start(done);
    radar.toggleAiming();

    turn.targetCell(at(0, 0));

    expect(radar.scan()?.found.length).toBeGreaterThan(0);
    expect(game.log()).toEqual([]);
    expect(game.enemyView()?.cells[0]?.[0]).toBe('unknown');
    expect(turn.active()).toBe(true);
    expect(done).not.toHaveBeenCalled();
  });

  it('blocks firing while a scan is showing, then fires normally', () => {
    const radar = TestBed.inject(PlayerRadar);
    turn.start(done);
    radar.toggleAiming();
    turn.targetCell(at(0, 0));

    turn.targetCell(at(0, 0));
    expect(game.log()).toEqual([]);

    vi.advanceTimersByTime(RADAR_REVEAL_MS);
    turn.targetCell(at(0, 0));
    expect(game.enemyView()?.cells[0]?.[0]).toBe('hit');
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('cancels radar aiming when the turn runs out', () => {
    const radar = TestBed.inject(PlayerRadar);
    turn.start(done);
    radar.toggleAiming();
    vi.advanceTimersByTime(TURN_TIME_LIMIT_MS);
    expect(radar.aiming()).toBe(false);
    expect(radar.scan()).toBeNull();
  });

  it('ignores shots outside the player turn', () => {
    game.passTurn(PLAYER);
    turn.fireAt(at(3, 3));
    expect(game.log().length).toBe(1);
    expect(turn.rejectedTarget()).toBeNull();
  });
});
