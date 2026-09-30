import { TestBed } from '@angular/core/testing';
import { RNG } from '@core/models/rng';
import { isFleetComplete, PLACEMENT_TIME_LIMIT_MS, seededRng, type Coord } from '@sinkmyship/game';
import { GameStore } from './game-store';

const at = (row: number, col: number): Coord => ({ row, col });

describe('GameStore', () => {
  let store: GameStore;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    TestBed.configureTestingModule({ providers: [{ provide: RNG, useValue: seededRng(1) }] });
    store = TestBed.inject(GameStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Places the 4x4 fleet by hand: 2-ship on A1-B1, 3-ship on A3-C3. */
  const placeWholeFleet = () => {
    store.selectShip('ship-1');
    store.clickCell(at(0, 0));
    store.clickCell(at(0, 1));
    store.selectShip('ship-2');
    store.clickCell(at(2, 0));
    store.clickCell(at(2, 1));
    store.clickCell(at(2, 2));
  };

  it('starts a game with an empty player board and a complete random computer fleet', () => {
    store.newGame(6);

    expect(store.playerBoard()?.ships).toEqual([]);
    const computer = store.computerBoard();
    expect(computer && isFleetComplete(computer)).toBe(true);
    expect(store.fleet().map((s) => s.length)).toEqual([3, 4, 5]);
    expect(store.remaining()).toBeNull();
  });

  it('counts down the blocks of the selected ship and places it on the last one', () => {
    store.newGame(4);
    store.selectShip('ship-2');
    expect(store.selectedShip()?.length).toBe(3);
    expect(store.remaining()).toBe(3);

    store.clickCell(at(1, 1));
    store.clickCell(at(1, 2));
    expect(store.remaining()).toBe(1);
    expect(store.draft()).toEqual([at(1, 1), at(1, 2)]);

    const before = store.playerBoard();
    store.clickCell(at(1, 0));
    expect(store.playerBoard()).not.toBe(before);
    expect(store.playerBoard()?.ships[0]?.cells).toEqual([at(1, 0), at(1, 1), at(1, 2)]);
    expect(store.placedShipIds().has('ship-2')).toBe(true);
    expect(store.selectedShip()).toBeNull();
    expect(store.remaining()).toBeNull();
    expect(store.draft()).toEqual([]);
  });

  it('rejects a diagonal block without adding it, and clears the rejection on a valid one', () => {
    store.newGame(4);
    store.selectShip('ship-1');
    store.clickCell(at(0, 0));

    store.clickCell(at(1, 1));
    expect(store.rejected()).toEqual(at(1, 1));
    expect(store.remaining()).toBe(1);

    store.clickCell(at(1, 0));
    expect(store.rejected()).toBeNull();
    expect(store.placedShipIds().has('ship-1')).toBe(true);
  });

  it('discards half-placed blocks when another ship is picked and ignores placed ships', () => {
    store.newGame(4);
    store.selectShip('ship-1');
    store.clickCell(at(0, 0));
    store.clickCell(at(0, 1));

    store.selectShip('ship-2');
    expect(store.draft()).toEqual([]);
    store.clickCell(at(0, 0));
    expect(store.rejected()).toEqual(at(0, 0));

    store.selectShip('ship-1');
    expect(store.selectedShip()?.id).toBe('ship-2');
  });

  it('ignores clicks while no ship is selected', () => {
    store.newGame(4);
    store.clickCell(at(0, 0));
    expect(store.draft()).toEqual([]);
    expect(store.rejected()).toBeNull();
  });

  describe('remove', () => {
    it('is unavailable until a whole ship is on the board', () => {
      store.newGame(4);
      expect(store.canRemove()).toBe(false);
      store.toggleRemoving();
      expect(store.removing()).toBe(false);

      store.selectShip('ship-1');
      store.clickCell(at(0, 0));
      expect(store.canRemove()).toBe(false);

      store.clickCell(at(0, 1));
      expect(store.canRemove()).toBe(true);
    });

    it('takes off the clicked ship and puts it back in the fleet to place', () => {
      store.newGame(4);
      placeWholeFleet();

      store.toggleRemoving();
      expect(store.removing()).toBe(true);
      store.clickCell(at(3, 3));
      expect(store.rejected()).toEqual(at(3, 3));
      expect(store.placedShipIds().size).toBe(2);

      store.clickCell(at(2, 1));
      expect(store.removing()).toBe(false);
      expect([...store.placedShipIds()]).toEqual(['ship-1']);
      expect(store.canRemove()).toBe(true);

      store.selectShip('ship-2');
      expect(store.selectedShip()?.id).toBe('ship-2');
    });

    it('drops a half-placed ship when entering remove mode, and picking a ship leaves it', () => {
      store.newGame(4);
      placeWholeFleet();
      store.toggleRemoving();
      store.clickCell(at(0, 0));
      store.selectShip('ship-1');
      store.clickCell(at(1, 0));

      store.toggleRemoving();
      expect(store.draft()).toEqual([]);
      expect(store.selectedShip()).toBeNull();

      store.selectShip('ship-1');
      expect(store.removing()).toBe(false);
    });
  });

  describe('placement countdown', () => {
    it('starts at five minutes and counts down', () => {
      store.newGame(6);
      expect(store.timeLeftMs()).toBe(PLACEMENT_TIME_LIMIT_MS);

      vi.advanceTimersByTime(61_000);
      expect(store.timeLeftMs()).toBe(PLACEMENT_TIME_LIMIT_MS - 61_000);
    });

    it('places the missing ships at random and locks placement when time runs out', () => {
      store.newGame(6);
      store.selectShip('ship-1');
      store.clickCell(at(0, 0));
      store.clickCell(at(0, 1));
      store.clickCell(at(0, 2));
      store.selectShip('ship-2');
      store.clickCell(at(2, 0));

      vi.advanceTimersByTime(PLACEMENT_TIME_LIMIT_MS);

      const board = store.playerBoard();
      expect(board && isFleetComplete(board)).toBe(true);
      expect(board?.ships.find((s) => s.id === 'ship-1')?.cells).toEqual([
        at(0, 0),
        at(0, 1),
        at(0, 2),
      ]);
      expect(store.placementOver()).toBe(true);
      expect(store.timeLeftMs()).toBe(0);
      expect(store.selectedShip()).toBeNull();
      expect(store.draft()).toEqual([]);
      expect(store.canRemove()).toBe(false);

      const before = store.playerBoard();
      store.toggleRemoving();
      store.clickCell(at(0, 0));
      expect(store.removing()).toBe(false);
      expect(store.playerBoard()).toBe(before);
    });

    it('restarts with each new game and stops on request', () => {
      store.newGame(4);
      vi.advanceTimersByTime(PLACEMENT_TIME_LIMIT_MS);
      expect(store.placementOver()).toBe(true);

      store.newGame(4);
      expect(store.placementOver()).toBe(false);
      expect(store.timeLeftMs()).toBe(PLACEMENT_TIME_LIMIT_MS);

      store.stopClock();
      vi.advanceTimersByTime(PLACEMENT_TIME_LIMIT_MS);
      expect(store.placementOver()).toBe(false);
    });
  });
});
