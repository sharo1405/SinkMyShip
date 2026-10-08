import { TestBed } from '@angular/core/testing';
import { COMPUTER, PLAYER } from '@core/models/seats';
import { GameStore } from '@core/services/game-store/game-store';
import { ScoreKeeper } from '@core/services/score-keeper/score-keeper';
import { earnPoints } from '@core/testing/earn-points';
import { coordLabel, RADAR_PRICE, RADAR_REVEAL_MS, type Coord } from '@sinkmyship/game';
import { PlayerRadar } from './player-radar';

const at = (row: number, col: number): Coord => ({ row, col });
const labels = (cells: readonly Coord[] | undefined) => (cells ?? []).map(coordLabel).sort();

describe('PlayerRadar', () => {
  let game: GameStore;
  let radar: PlayerRadar;

  beforeEach(() => {
    vi.useFakeTimers();
    game = TestBed.inject(GameStore);
    radar = TestBed.inject(PlayerRadar);

    // 6x6 battle with both fleets on A1-B1, A3-C3 and A5-D5; the player fires first.
    game.newGame(6);
    for (const seat of [PLAYER, COMPUTER]) {
      game.placeShip(seat, { id: 'ship-1', length: 2 }, [at(0, 0), at(0, 1)]);
      game.placeShip(seat, { id: 'ship-2', length: 3 }, [at(2, 0), at(2, 1), at(2, 2)]);
      game.placeShip(seat, { id: 'ship-3', length: 4 }, [at(4, 0), at(4, 1), at(4, 2), at(4, 3)]);
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const points = () => TestBed.inject(ScoreKeeper).player().points;

  it('is unavailable outside the player turn and below RADAR_PRICE points', () => {
    expect(radar.state()).toBe('unavailable');
    game.startBattle();
    expect(radar.state()).toBe('unavailable');
    radar.toggleAiming();
    expect(radar.aiming()).toBe(false);

    earnPoints(game, 1);
    expect(radar.state()).toBe('unavailable');
    earnPoints(game, 1);
    expect(points()).toBe(RADAR_PRICE);
    expect(radar.state()).toBe('ready');
    game.fire(PLAYER, at(5, 5));
    expect(radar.state()).toBe('unavailable');
  });

  it('cancels aiming only by pressing Radar again, without scanning or paying', () => {
    game.startBattle();
    earnPoints(game);
    const logLength = game.log().length;
    radar.toggleAiming();
    expect(radar.aiming()).toBe(true);
    expect(radar.state()).toBe('active');

    radar.toggleAiming();
    expect(radar.aiming()).toBe(false);
    expect(radar.state()).toBe('ready');
    expect(radar.scan()).toBeNull();
    expect(game.log()).toHaveLength(logLength);
    expect(points()).toBe(6);
  });

  it('scans a row and column for RADAR_PRICE, shows what it found for RADAR_REVEAL_MS', () => {
    game.startBattle();
    earnPoints(game);
    const logLength = game.log().length;
    radar.scanAt(at(0, 0));
    expect(radar.scan()).toBeNull();

    radar.toggleAiming();
    expect(points()).toBe(6);
    radar.scanAt(at(2, 1));

    expect(radar.aiming()).toBe(false);
    // Row 3: A3, B3, C3. Column B: B1, B5 (and B3, already counted).
    expect(labels(radar.scan()?.found)).toEqual(['A3', 'B1', 'B3', 'B5', 'C3']);
    expect(radar.scan()?.cells).toHaveLength(11);
    expect(radar.scanning()).toBe(true);
    expect(game.isTurnOf(PLAYER)).toBe(true);
    expect(game.log().slice(logLength)).toEqual([
      { kind: 'power', seat: PLAYER, power: 'radar', cost: RADAR_PRICE },
    ]);
    expect(points()).toBe(6 - RADAR_PRICE);

    vi.advanceTimersByTime(RADAR_REVEAL_MS - 1);
    expect(radar.scanning()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(radar.scan()).toBeNull();
  });

  it('charges each scan, so it can scan again in the same turn while points last', () => {
    game.startBattle();
    earnPoints(game);
    radar.toggleAiming();
    radar.scanAt(at(0, 0));
    // Not while a scan is showing, so two results never overlap.
    expect(radar.state()).toBe('unavailable');
    radar.toggleAiming();
    expect(radar.aiming()).toBe(false);

    vi.advanceTimersByTime(RADAR_REVEAL_MS);
    expect(radar.state()).toBe('ready');
    radar.toggleAiming();
    radar.scanAt(at(4, 3));
    expect(labels(radar.scan()?.found)).toEqual(['A5', 'B5', 'C5', 'D5']);

    vi.advanceTimersByTime(RADAR_REVEAL_MS);
    radar.toggleAiming();
    radar.scanAt(at(5, 5));
    expect(radar.scan()?.found).toEqual([]);
    expect(points()).toBe(0);
    vi.advanceTimersByTime(RADAR_REVEAL_MS);
    expect(radar.state()).toBe('unavailable');
    expect(game.isTurnOf(PLAYER)).toBe(true);
  });

  it('clears the scan and its timer on stop', () => {
    game.startBattle();
    earnPoints(game);
    radar.toggleAiming();
    radar.scanAt(at(0, 0));
    radar.stop();
    expect(radar.scan()).toBeNull();
    expect(radar.state()).toBe('ready');
    expect(vi.getTimerCount()).toBe(0);
  });
});
