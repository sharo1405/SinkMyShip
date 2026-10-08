import { TestBed } from '@angular/core/testing';
import { RNG } from '@core/models/rng';
import { COMPUTER, PLAYER } from '@core/models/seats';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerRadar } from '@core/services/player-radar/player-radar';
import { seededRng, type Coord } from '@sinkmyship/game';
import { PlayerRandomShots } from './player-random-shots';

const at = (row: number, col: number): Coord => ({ row, col });

describe('PlayerRandomShots', () => {
  let game: GameStore;
  let shots: PlayerRandomShots;
  let radar: PlayerRadar;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: RNG, useValue: seededRng(4) }] });
    game = TestBed.inject(GameStore);
    shots = TestBed.inject(PlayerRandomShots);
    radar = TestBed.inject(PlayerRadar);

    // 6x6 battle with both fleets on A1-B1, A3-C3 and A5-D5; the player fires first.
    game.newGame(6);
    for (const seat of [PLAYER, COMPUTER]) {
      game.placeShip(seat, { id: 'ship-1', length: 2 }, [at(0, 0), at(0, 1)]);
      game.placeShip(seat, { id: 'ship-2', length: 3 }, [at(2, 0), at(2, 1), at(2, 2)]);
      game.placeShip(seat, { id: 'ship-3', length: 4 }, [at(4, 0), at(4, 1), at(4, 2), at(4, 3)]);
    }
  });

  it('is unavailable outside the player turn', () => {
    expect(shots.state()).toBe('unavailable');
    shots.toggle();
    expect(shots.armed()).toBe(false);
    game.startBattle();
    expect(shots.state()).toBe('ready');
  });

  it('arms, and pressing it again cancels without firing', () => {
    game.startBattle();
    shots.toggle();
    expect(shots.armed()).toBe(true);
    expect(shots.state()).toBe('active');

    shots.toggle();
    expect(shots.armed()).toBe(false);
    expect(shots.fire()).toBe(false);
    expect(game.log()).toEqual([]);
  });

  it('is never active together with the Radar', () => {
    game.startBattle();
    radar.toggleAiming();
    shots.toggle();
    expect(shots.armed()).toBe(true);
    expect(radar.aiming()).toBe(false);

    radar.toggleAiming();
    expect(radar.aiming()).toBe(true);
    expect(shots.armed()).toBe(false);
  });

  it('fires 5 random shots when armed and hands the turn to the computer', () => {
    game.startBattle();
    shots.toggle();
    expect(shots.fire()).toBe(true);

    expect(game.log()).toHaveLength(5);
    expect(game.log().every((e) => e.kind === 'shot' && e.power === 'random-shots')).toBe(true);
    expect(game.turn()).toBe(COMPUTER);
    expect(shots.armed()).toBe(false);
  });
});
