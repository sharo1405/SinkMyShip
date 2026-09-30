import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RNG } from '@core/models/rng';
import { COMPUTER } from '@core/models/seats';
import { isFleetComplete, PLACEMENT_TIME_LIMIT_MS, seededRng, type Coord } from '@sinkmyship/game';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerPlacement } from './player-placement';

const at = (row: number, col: number): Coord => ({ row, col });

describe('PlayerPlacement', () => {
  let game: GameStore;
  let placement: PlayerPlacement;
  let done: Mock<() => void>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    TestBed.configureTestingModule({ providers: [{ provide: RNG, useValue: seededRng(1) }] });
    game = TestBed.inject(GameStore);
    placement = TestBed.inject(PlayerPlacement);
    done = vi.fn<() => void>();
    start(4);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** A new game on a `size` board, computer fleet placed, player placement open. */
  function start(size: 4 | 6) {
    game.newGame(size);
    game.placeFleetRandomly(COMPUTER, seededRng(9));
    placement.start(done);
  }

  /** Places the 4x4 fleet by hand: 2-block on A1-B1, 3-block on A3-C3. */
  const placeWholeFleet = () => {
    placement.selectShip('ship-1');
    placement.clickCell(at(0, 0));
    placement.clickCell(at(0, 1));
    placement.selectShip('ship-2');
    placement.clickCell(at(2, 0));
    placement.clickCell(at(2, 1));
    placement.clickCell(at(2, 2));
  };

  describe('placing ships', () => {
    it('counts down the blocks of the selected ship and places it on the last one', () => {
      placement.selectShip('ship-2');
      expect(placement.remaining()).toBe(3);

      placement.clickCell(at(1, 1));
      placement.clickCell(at(1, 2));
      expect(placement.remaining()).toBe(1);
      expect(placement.draft()).toEqual([at(1, 1), at(1, 2)]);

      placement.clickCell(at(1, 0));
      expect(game.playerBoard()?.ships[0]?.cells).toEqual([at(1, 0), at(1, 1), at(1, 2)]);
      expect(placement.selectedShip()).toBeNull();
      expect(placement.remaining()).toBeNull();
    });

    it('rejects a diagonal block without adding it, and clears the rejection on a valid one', () => {
      placement.selectShip('ship-1');
      placement.clickCell(at(0, 0));

      placement.clickCell(at(1, 1));
      expect(placement.rejected()).toEqual(at(1, 1));
      expect(placement.remaining()).toBe(1);

      placement.clickCell(at(1, 0));
      expect(placement.rejected()).toBeNull();
      expect(game.placedShipIds().has('ship-1')).toBe(true);
    });

    it('discards half-placed blocks on a new pick and ignores placed ships', () => {
      placement.selectShip('ship-1');
      placement.clickCell(at(0, 0));
      placement.clickCell(at(0, 1));

      placement.selectShip('ship-2');
      expect(placement.draft()).toEqual([]);
      placement.clickCell(at(0, 0));
      expect(placement.rejected()).toEqual(at(0, 0));

      placement.selectShip('ship-1');
      expect(placement.selectedShip()?.id).toBe('ship-2');
    });

    it('ignores clicks while no ship is selected', () => {
      placement.clickCell(at(0, 0));
      expect(placement.draft()).toEqual([]);
      expect(placement.rejected()).toBeNull();
    });
  });

  describe('remove', () => {
    it('is unavailable until a whole ship is on the board', () => {
      expect(placement.canRemove()).toBe(false);
      placement.toggleRemoving();
      expect(placement.removing()).toBe(false);

      placement.selectShip('ship-1');
      placement.clickCell(at(0, 0));
      expect(placement.canRemove()).toBe(false);
      placement.clickCell(at(0, 1));
      expect(placement.canRemove()).toBe(true);
    });

    it('takes off the clicked ship and puts it back in the fleet to place', () => {
      placeWholeFleet();
      placement.toggleRemoving();
      placement.clickCell(at(3, 3));
      expect(placement.rejected()).toEqual(at(3, 3));

      placement.clickCell(at(2, 1));
      expect(placement.removing()).toBe(false);
      expect([...game.placedShipIds()]).toEqual(['ship-1']);

      placement.selectShip('ship-2');
      expect(placement.selectedShip()?.id).toBe('ship-2');
    });
  });

  describe('finishing', () => {
    it('offers Ready only with the whole fleet down, and Ready ends placement', () => {
      placement.ready();
      expect(done).not.toHaveBeenCalled();

      placeWholeFleet();
      expect(placement.canReady()).toBe(true);
      placement.ready();

      expect(done).toHaveBeenCalledTimes(1);
      expect(placement.autoPlaced()).toBe(false);
      expect(placement.timeLeftMs()).toBeNull();
    });

    it('counts down five minutes, then places the missing ships and ends placement', () => {
      start(6);
      expect(placement.timeLeftMs()).toBe(PLACEMENT_TIME_LIMIT_MS);
      placement.selectShip('ship-1');
      for (const col of [0, 1, 2]) placement.clickCell(at(0, col));
      placement.selectShip('ship-2');
      placement.clickCell(at(2, 0));

      vi.advanceTimersByTime(61_000);
      expect(placement.timeLeftMs()).toBe(PLACEMENT_TIME_LIMIT_MS - 61_000);
      vi.advanceTimersByTime(PLACEMENT_TIME_LIMIT_MS - 61_000);

      const board = game.playerBoard();
      expect(board && isFleetComplete(board)).toBe(true);
      expect(board?.ships.find((s) => s.id === 'ship-1')?.cells).toEqual([
        at(0, 0),
        at(0, 1),
        at(0, 2),
      ]);
      expect(placement.autoPlaced()).toBe(true);
      expect(placement.draft()).toEqual([]);
      expect(done).toHaveBeenCalledTimes(1);
    });

    it('does nothing once stopped', () => {
      placement.stop();
      vi.advanceTimersByTime(PLACEMENT_TIME_LIMIT_MS);
      expect(done).not.toHaveBeenCalled();
      expect(game.placedShipIds().size).toBe(0);
    });
  });
});
