import { TestBed } from '@angular/core/testing';
import { RNG } from '@core/models/rng';
import { COMPUTER, PLAYER } from '@core/models/seats';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerRadar } from '@core/services/player-radar/player-radar';
import { earnPoints } from '@core/testing/earn-points';
import { seededRng, SHOTGUN_PRICE, type Coord } from '@sinkmyship/game';
import { PlayerShotgun } from './player-shotgun';

const at = (row: number, col: number): Coord => ({ row, col });

describe('PlayerShotgun', () => {
  let game: GameStore;
  let shots: PlayerShotgun;
  let radar: PlayerRadar;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: RNG, useValue: seededRng(4) }] });
    game = TestBed.inject(GameStore);
    shots = TestBed.inject(PlayerShotgun);
    radar = TestBed.inject(PlayerRadar);

    // 6x6 battle with both fleets on A1-B1, A3-C3 and A5-D5; the player fires first.
    game.newGame(6);
    for (const seat of [PLAYER, COMPUTER]) {
      game.placeShip(seat, { id: 'ship-1', length: 2 }, [at(0, 0), at(0, 1)]);
      game.placeShip(seat, { id: 'ship-2', length: 3 }, [at(2, 0), at(2, 1), at(2, 2)]);
      game.placeShip(seat, { id: 'ship-3', length: 4 }, [at(4, 0), at(4, 1), at(4, 2), at(4, 3)]);
    }
  });

  it('is unavailable outside the player turn and below SHOTGUN_PRICE points', () => {
    expect(shots.state()).toBe('unavailable');
    shots.toggle();
    expect(shots.armed()).toBe(false);
    game.startBattle();
    expect(shots.state()).toBe('unavailable');
    earnPoints(game);
    expect(shots.state()).toBe('ready');
  });

  it('arms, and pressing it again cancels without firing or paying', () => {
    game.startBattle();
    earnPoints(game);
    const logLength = game.log().length;
    shots.toggle();
    expect(shots.armed()).toBe(true);
    expect(shots.state()).toBe('active');

    shots.toggle();
    expect(shots.armed()).toBe(false);
    expect(shots.fire()).toBe(false);
    expect(game.log()).toHaveLength(logLength);
  });

  it('is never active together with the Radar', () => {
    game.startBattle();
    earnPoints(game);
    radar.toggleAiming();
    shots.toggle();
    expect(shots.armed()).toBe(true);
    expect(radar.aiming()).toBe(false);

    radar.toggleAiming();
    expect(radar.aiming()).toBe(true);
    expect(shots.armed()).toBe(false);
  });

  it('fires the Shotgun when armed, pays after the shots, and hands the turn over', () => {
    game.startBattle();
    earnPoints(game);
    const logLength = game.log().length;
    shots.toggle();
    expect(shots.fire()).toBe(true);

    const turn = game.log().slice(logLength);
    expect(turn).toHaveLength(5 + 1);
    expect(turn.slice(0, 5).every((e) => e.kind === 'shot' && e.power === 'shotgun')).toBe(true);
    expect(turn[5]).toEqual({ kind: 'power', seat: PLAYER, power: 'shotgun', cost: SHOTGUN_PRICE });
    expect(game.turn()).toBe(COMPUTER);
    expect(shots.armed()).toBe(false);
  });
});
