import { TestBed } from '@angular/core/testing';
import { COMPUTER, PLAYER } from '@core/models/seats';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerRadar } from '@core/services/player-radar/player-radar';
import { PlayerShotgun } from '@core/services/player-shotgun/player-shotgun';
import { earnPoints } from '@core/testing/earn-points';
import { DOUBLE_MISSILES_PRICE, type Coord } from '@sinkmyship/game';
import { PlayerDoubleMissiles } from './player-double-missiles';

const at = (row: number, col: number): Coord => ({ row, col });

describe('PlayerDoubleMissiles', () => {
  let game: GameStore;
  let missiles: PlayerDoubleMissiles;

  beforeEach(() => {
    game = TestBed.inject(GameStore);
    missiles = TestBed.inject(PlayerDoubleMissiles);

    // 6x6 battle with both fleets on A1-B1, A3-C3 and A5-D5; the player fires first.
    game.newGame(6);
    for (const seat of [PLAYER, COMPUTER]) {
      game.placeShip(seat, { id: 'ship-1', length: 2 }, [at(0, 0), at(0, 1)]);
      game.placeShip(seat, { id: 'ship-2', length: 3 }, [at(2, 0), at(2, 1), at(2, 2)]);
      game.placeShip(seat, { id: 'ship-3', length: 4 }, [at(4, 0), at(4, 1), at(4, 2), at(4, 3)]);
    }
  });

  it('is unavailable outside the player turn and below DOUBLE_MISSILES_PRICE points', () => {
    expect(missiles.state()).toBe('unavailable');
    missiles.toggle();
    expect(missiles.armed()).toBe(false);
    game.startBattle();
    expect(missiles.state()).toBe('unavailable');
    earnPoints(game);
    expect(missiles.state()).toBe('ready');
  });

  it('picks and unpicks up to 2 new cells, ignoring a third and cells already shot', () => {
    game.startBattle();
    earnPoints(game);
    game.fire(PLAYER, at(5, 5));
    game.passTurn(COMPUTER);
    const logLength = game.log().length;
    missiles.toggleTarget(at(0, 0));
    expect(missiles.targets()).toEqual([]);

    missiles.toggle();
    missiles.toggleTarget(at(5, 5));
    expect(missiles.targets()).toEqual([]);
    missiles.toggleTarget(at(0, 0));
    missiles.toggleTarget(at(3, 3));
    expect(missiles.ready()).toBe(true);
    missiles.toggleTarget(at(1, 1));
    expect(missiles.targets()).toEqual([at(0, 0), at(3, 3)]);

    missiles.toggleTarget(at(0, 0));
    expect(missiles.targets()).toEqual([at(3, 3)]);
    expect(missiles.ready()).toBe(false);
    expect(game.log()).toHaveLength(logLength);
  });

  it('cancels and clears the picks when pressed again, without paying', () => {
    game.startBattle();
    earnPoints(game);
    const logLength = game.log().length;
    missiles.toggle();
    missiles.toggleTarget(at(0, 0));
    missiles.toggle();
    expect(missiles.armed()).toBe(false);
    expect(missiles.fire()).toBe(false);

    missiles.toggle();
    expect(missiles.targets()).toEqual([]);
    expect(game.log()).toHaveLength(logLength);
  });

  it('is never active together with the Radar or the Shotgun', () => {
    const radar = TestBed.inject(PlayerRadar);
    const shotgun = TestBed.inject(PlayerShotgun);
    game.startBattle();
    earnPoints(game);
    missiles.toggle();
    missiles.toggleTarget(at(0, 0));

    radar.toggleAiming();
    expect(missiles.armed()).toBe(false);
    expect(missiles.targets()).toEqual([]);
    missiles.toggle();
    expect(radar.aiming()).toBe(false);
    shotgun.toggle();
    expect(missiles.armed()).toBe(false);
    missiles.toggle();
    expect(shotgun.armed()).toBe(false);
  });

  it('fires both missiles in the order picked, pays after them, and hands the turn over', () => {
    game.startBattle();
    earnPoints(game);
    const logLength = game.log().length;
    missiles.toggle();
    missiles.toggleTarget(at(5, 5));
    expect(missiles.fire()).toBe(false);
    missiles.toggleTarget(at(0, 0));
    expect(missiles.fire()).toBe(true);

    expect(game.log().slice(logLength)).toEqual([
      {
        kind: 'shot',
        seat: PLAYER,
        at: at(5, 5),
        outcome: { kind: 'miss' },
        power: 'double-missiles',
      },
      {
        kind: 'shot',
        seat: PLAYER,
        at: at(0, 0),
        outcome: { kind: 'hit', shipId: 'ship-1' },
        power: 'double-missiles',
      },
      { kind: 'power', seat: PLAYER, power: 'double-missiles', cost: DOUBLE_MISSILES_PRICE },
    ]);
    expect(game.turn()).toBe(COMPUTER);
    expect(missiles.armed()).toBe(false);
  });
});
