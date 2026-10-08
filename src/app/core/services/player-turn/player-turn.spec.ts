import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { COMPUTER, PLAYER } from '@core/models/seats';
import { RADAR_REVEAL_MS, TURN_TIME_LIMIT_MS, type Coord } from '@sinkmyship/game';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerDoubleMissiles } from '@core/services/player-double-missiles/player-double-missiles';
import { PlayerRadar } from '@core/services/player-radar/player-radar';
import { PlayerShotgun } from '@core/services/player-shotgun/player-shotgun';
import { earnPoints } from '@core/testing/earn-points';
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
    earnPoints(game);
    const logLength = game.log().length;
    turn.start(done);
    radar.toggleAiming();

    turn.targetCell(at(0, 0));

    expect(radar.scan()?.found.length).toBeGreaterThan(0);
    // Only the scan's payment: nothing was fired.
    expect(
      game
        .log()
        .slice(logLength)
        .map((e) => e.kind),
    ).toEqual(['power']);
    expect(game.enemyView()?.cells[0]?.[0]).toBe('unknown');
    expect(turn.active()).toBe(true);
    expect(done).not.toHaveBeenCalled();
  });

  it('blocks firing while a scan is showing, then fires normally', () => {
    const radar = TestBed.inject(PlayerRadar);
    earnPoints(game);
    const logLength = game.log().length;
    turn.start(done);
    radar.toggleAiming();
    turn.targetCell(at(0, 0));

    turn.targetCell(at(0, 0));
    // Only the scan's payment: nothing was fired.
    expect(
      game
        .log()
        .slice(logLength)
        .map((e) => e.kind),
    ).toEqual(['power']);

    vi.advanceTimersByTime(RADAR_REVEAL_MS);
    turn.targetCell(at(0, 0));
    expect(game.enemyView()?.cells[0]?.[0]).toBe('hit');
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('cancels radar aiming when the turn runs out', () => {
    const radar = TestBed.inject(PlayerRadar);
    earnPoints(game);
    const logLength = game.log().length;
    turn.start(done);
    radar.toggleAiming();
    vi.advanceTimersByTime(TURN_TIME_LIMIT_MS);
    expect(radar.aiming()).toBe(false);
    expect(radar.scan()).toBeNull();
  });

  it('fires the armed Shotgun as the whole turn: 5 shots, one handoff', () => {
    const shots = TestBed.inject(PlayerShotgun);
    earnPoints(game);
    const logLength = game.log().length;
    turn.start(done);
    turn.fireShotgun();
    expect(game.log()).toHaveLength(logLength);

    shots.toggle();
    turn.fireShotgun();

    // Five shots, then the payment.
    expect(game.log()).toHaveLength(logLength + 5 + 1);
    expect(game.turn()).toBe(COMPUTER);
    expect(turn.active()).toBe(false);
    expect(turn.timeLeftMs()).toBeNull();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('cancels an armed Shotgun and skips the turn when the clock runs out', () => {
    const shots = TestBed.inject(PlayerShotgun);
    earnPoints(game);
    const logLength = game.log().length;
    turn.start(done);
    shots.toggle();
    vi.advanceTimersByTime(TURN_TIME_LIMIT_MS);

    expect(shots.armed()).toBe(false);
    expect(game.log().slice(logLength)).toEqual([{ kind: 'timeout', seat: PLAYER }]);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('picks targets instead of firing while Double Missiles is armed, then fires both as the turn', () => {
    const missiles = TestBed.inject(PlayerDoubleMissiles);
    earnPoints(game);
    const logLength = game.log().length;
    turn.start(done);
    missiles.toggle();
    turn.targetCell(at(0, 0));
    turn.targetCell(at(3, 3));
    expect(game.log()).toHaveLength(logLength);
    expect(turn.active()).toBe(true);

    turn.fireDoubleMissiles();

    // Two missiles, then the payment.
    expect(game.log()).toHaveLength(logLength + 2 + 1);
    expect(game.turn()).toBe(COMPUTER);
    expect(turn.timeLeftMs()).toBeNull();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('cancels an armed Double Missiles and skips the turn when the clock runs out', () => {
    const missiles = TestBed.inject(PlayerDoubleMissiles);
    earnPoints(game);
    const logLength = game.log().length;
    turn.start(done);
    missiles.toggle();
    turn.targetCell(at(0, 0));
    vi.advanceTimersByTime(TURN_TIME_LIMIT_MS);

    expect(missiles.armed()).toBe(false);
    expect(missiles.targets()).toEqual([]);
    expect(game.log().slice(logLength)).toEqual([{ kind: 'timeout', seat: PLAYER }]);
  });

  it('ignores shots outside the player turn', () => {
    game.passTurn(PLAYER);
    turn.fireAt(at(3, 3));
    expect(game.log().length).toBe(1);
    expect(turn.rejectedTarget()).toBeNull();
  });
});
