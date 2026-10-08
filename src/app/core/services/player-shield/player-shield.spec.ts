import { TestBed } from '@angular/core/testing';
import { COMPUTER, PLAYER } from '@core/models/seats';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerDoubleMissiles } from '@core/services/player-double-missiles/player-double-missiles';
import type { Coord } from '@sinkmyship/game';
import { PlayerShield, SHIELD_ALERT_MS } from './player-shield';

const at = (row: number, col: number): Coord => ({ row, col });

describe('PlayerShield', () => {
  let game: GameStore;
  let shield: PlayerShield;

  beforeEach(() => {
    vi.useFakeTimers();
    game = TestBed.inject(GameStore);
    shield = TestBed.inject(PlayerShield);

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

  it('goes up with one press, stays on with no cancel, and keeps the turn', () => {
    expect(shield.state()).toBe('ready');
    shield.activate();
    expect(shield.up()).toBe(true);
    expect(shield.state()).toBe('on');

    shield.activate();
    expect(shield.up()).toBe(true);
    expect(game.isTurnOf(PLAYER)).toBe(true);
    expect(game.log()).toEqual([]);
  });

  it('cancels a power being aimed', () => {
    const missiles = TestBed.inject(PlayerDoubleMissiles);
    missiles.toggle();
    missiles.toggleTarget(at(0, 0));
    shield.activate();
    expect(missiles.armed()).toBe(false);
    expect(missiles.targets()).toEqual([]);
  });

  it("flashes for SHIELD_ALERT_MS after it blocks the computer's shot, then is gone", () => {
    shield.activate();
    game.fire(PLAYER, at(5, 5));
    shield.alertIfJustBlocked();
    expect(shield.alerting()).toBe(false);

    game.fire(COMPUTER, at(0, 0));
    shield.alertIfJustBlocked();

    expect(shield.alerting()).toBe(true);
    expect(shield.up()).toBe(false);
    expect(game.playerBoard()?.shots).toEqual([]);
    vi.advanceTimersByTime(SHIELD_ALERT_MS - 1);
    expect(shield.alerting()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(shield.alerting()).toBe(false);
  });

  it('stays up through a computer turn lost to the clock, and stop clears a flash', () => {
    shield.activate();
    game.fire(PLAYER, at(5, 5));
    game.passTurn(COMPUTER);
    shield.alertIfJustBlocked();
    expect(shield.up()).toBe(true);
    expect(shield.alerting()).toBe(false);

    game.fire(PLAYER, at(5, 4));
    game.fire(COMPUTER, at(0, 0));
    shield.alertIfJustBlocked();
    shield.stop();
    expect(shield.alerting()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
