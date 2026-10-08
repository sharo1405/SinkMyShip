import { TestBed } from '@angular/core/testing';
import { COMPUTER_SHOT_DELAY_MS } from '@core/models/game-timing';
import { RNG } from '@core/models/rng';
import type { BoardOptionId } from '@core/models/board-option';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerTurn } from '@core/services/player-turn/player-turn';
import { SetupStore } from '@core/services/setup-store/setup-store';
import {
  coordLabel,
  PLACEMENT_TIME_LIMIT_MS,
  RADAR_REVEAL_MS,
  radarCross,
  sameCoord,
  seededRng,
  type Coord,
} from '@sinkmyship/game';
import { BattlePage } from './battle-page';

async function setup(board: BoardOptionId) {
  TestBed.configureTestingModule({
    providers: [
      { provide: RNG, useValue: seededRng(1) },
      // The computer fires on the next macrotask, so tests needn't wait three real seconds.
      { provide: COMPUTER_SHOT_DELAY_MS, useValue: 0 },
    ],
  });
  const store = TestBed.inject(SetupStore);
  store.chooseBoard(board);
  store.chooseShipColor('green');

  const fixture = TestBed.createComponent(BattlePage);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const trayShip = (name: string) =>
    [...root.querySelectorAll<HTMLButtonElement>('[aria-label="Your ships"] button')].find(
      (b) => b.querySelector('[role="img"]')?.getAttribute('aria-label') === name,
    );
  const cell = (coord: string) => root.querySelector<HTMLButtonElement>(`#player-${coord} button`);
  const remaining = () => root.querySelector<HTMLInputElement>('input[type="text"]');
  const removeButton = () =>
    [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      /^(Cancel remove|Remove)$/.test(b.textContent?.trim() ?? ''),
    );
  const timer = () => root.querySelector('[role="timer"]')?.textContent?.trim() ?? null;
  const status = () => root.querySelector('[role="status"]')?.textContent?.trim() ?? '';
  const button = (text: string) =>
    [...root.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.trim() === text,
    );
  const enemyCell = (c: Coord) =>
    root.querySelector<HTMLButtonElement>(`#computer-${coordLabel(c)} button`);
  const click = async (el: HTMLElement | null | undefined) => {
    el?.click();
    await fixture.whenStable();
  };
  /** Lets the computer (delay 0) take its turn. */
  const computerTurn = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  };
  /** Places the 6x6 fleet: 2-block on A1-B1, 3-block on A3-C3, 4-block on A5-D5. */
  const placeFleet = async () => {
    await click(trayShip('2-block ship'));
    for (const c of ['A1', 'B1']) await click(cell(c));
    await click(trayShip('3-block ship'));
    for (const c of ['A3', 'B3', 'C3']) await click(cell(c));
    await click(trayShip('4-block ship'));
    for (const c of ['A5', 'B5', 'C5', 'D5']) await click(cell(c));
  };
  const game = TestBed.inject(GameStore);
  return {
    fixture,
    root,
    game,
    trayShip,
    cell,
    enemyCell,
    remaining,
    removeButton,
    button,
    timer,
    status,
    click,
    computerTurn,
    placeFleet,
  };
}

describe('BattlePage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the player's and the computer's boards at the chosen size", async () => {
    const { root } = await setup('8x8');

    const captions = [...root.querySelectorAll('caption')].map((c) => c.textContent?.trim());
    expect(captions).toEqual(['Your board', "Computer's board"]);
    expect(root.querySelector('#player-A1')).not.toBeNull();
    expect(root.querySelector('#player-H8')).not.toBeNull();
    expect(root.querySelector('#computer-H8')).not.toBeNull();
    expect(root.querySelectorAll('td.cell').length).toBe(128);
  });

  it("shows the player's fleet under the boards and the computer's fleet on its board", async () => {
    const { root, trayShip, remaining, status } = await setup('8x8');

    for (const n of [3, 4, 5, 6]) expect(trayShip(`${n}-block ship`)).toBeDefined();
    expect(status()).toBe('Pick a ship under your board, then click its blocks on your board.');
    expect(root.querySelectorAll('[id^="computer-"].ship').length).toBe(3 + 4 + 5 + 6);
    expect(root.querySelectorAll('[id^="player-"].ship').length).toBe(0);
    expect(remaining()).toBeNull();
  });

  it('selects a ship, counts down while placing it block by block, then hides the counter', async () => {
    const { root, trayShip, cell, remaining, click } = await setup('6x6');

    await click(trayShip('3-block ship'));
    expect(trayShip('3-block ship')?.getAttribute('aria-pressed')).toBe('true');
    expect(trayShip('3-block ship')?.classList).toContain('selected');
    expect(trayShip('2-block ship')?.getAttribute('aria-pressed')).toBe('false');
    expect(remaining()?.value).toBe('Remaining: 3');

    await click(cell('A1'));
    expect(remaining()?.value).toBe('Remaining: 2');
    expect(root.querySelector('#player-A1')?.classList).toContain('draft');

    await click(cell('A2'));
    expect(remaining()?.value).toBe('Remaining: 1');
    await click(cell('A3'));

    expect(remaining()).toBeNull();
    expect(root.querySelectorAll('[id^="player-"].ship').length).toBe(3);
    expect(trayShip('3-block ship, placed')?.disabled).toBe(true);
  });

  it('borders a diagonal block red and does not count it', async () => {
    const { root, trayShip, cell, remaining, click } = await setup('6x6');

    await click(trayShip('2-block ship'));
    await click(cell('B2'));
    await click(cell('C3'));

    expect(root.querySelector('#player-C3')?.classList).toContain('rejected');
    expect(remaining()?.value).toBe('Remaining: 1');

    await click(cell('B3'));
    expect(root.querySelector('.rejected')).toBeNull();
    expect(remaining()).toBeNull();
  });

  it('keeps Remove disabled until a whole ship is placed, then removes the clicked ship', async () => {
    const { root, trayShip, cell, removeButton, status, click } = await setup('6x6');
    expect(removeButton()?.disabled).toBe(true);

    await click(trayShip('2-block ship'));
    await click(cell('A1'));
    expect(removeButton()?.disabled).toBe(true);
    await click(cell('B1'));
    expect(removeButton()?.disabled).toBe(false);

    await click(removeButton());
    expect(removeButton()?.textContent?.trim()).toBe('Cancel remove');
    expect(status()).toBe('Click a ship on your board to remove it.');

    await click(cell('B1'));
    expect(root.querySelectorAll('[id^="player-"].ship').length).toBe(0);
    expect(trayShip('2-block ship')?.disabled).toBe(false);
    expect(removeButton()?.textContent?.trim()).toBe('Remove');
    expect(removeButton()?.disabled).toBe(true);
  });

  it('counts down five minutes, then places the fleet itself and starts the battle', async () => {
    const { fixture, root, trayShip, removeButton, button, timer, status } = await setup('6x6');
    expect(timer()).toBe('Time left: 5:00');

    vi.advanceTimersByTime(90_000);
    await fixture.whenStable();
    expect(timer()).toBe('Time left: 3:30');

    vi.advanceTimersByTime(PLACEMENT_TIME_LIMIT_MS - 90_000);
    await fixture.whenStable();

    expect(timer()).toBe('Your turn: 0:10');
    expect(status()).toBe(
      "Time is up. Your remaining ships were placed for you. Your turn: fire at the computer's board.",
    );
    expect(root.querySelectorAll('[id^="player-"].ship').length).toBe(2 + 3 + 4);
    expect(root.querySelector('#player-A1 button')).toBeNull();
    expect(trayShip('3-block ship')).toBeUndefined();
    expect(removeButton()).toBeUndefined();
    expect(button('Ready')).toBeUndefined();
  });

  it('shows Ready only once every ship is placed, and Ready starts the battle', async () => {
    const { root, button, status, timer, click, placeFleet } = await setup('6x6');
    expect(button('Ready')).toBeUndefined();

    await placeFleet();
    expect(status()).toBe('All ships placed. Press Ready to start the battle.');
    await click(button('Ready'));

    expect(timer()).toBe('Your turn: 0:10');
    expect(root.querySelector('[aria-label="Your ships"]')).toBeNull();
    expect(root.querySelectorAll('[id^="computer-"].ship').length).toBe(0);
    expect(root.querySelectorAll('[id^="computer-"] button').length).toBe(36);
  });

  it('marks a miss grey and a hit red on both boards, turn by turn', async () => {
    const { root, game, button, enemyCell, status, timer, click, computerTurn, placeFleet } =
      await setup('6x6');
    await placeFleet();
    await click(button('Ready'));

    const shipCells = game.computerBoard()?.ships.flatMap((s) => s.cells) ?? [];
    const isShip = (c: Coord) => shipCells.some((s) => s.row === c.row && s.col === c.col);
    const water = [0, 1, 2, 3, 4, 5]
      .flatMap((row) => [0, 1, 2, 3, 4, 5].map((col) => ({ row, col })))
      .find((c) => !isShip(c));
    if (!water) throw new Error('No water on the computer board');

    await click(enemyCell(water));
    const waterCell = root.querySelector(`#computer-${coordLabel(water)}`);
    expect(waterCell?.classList).toContain('miss');
    expect(waterCell?.querySelector('[aria-hidden="true"]')?.textContent).toBe('•');
    expect(timer()).toBe("Computer's turn");
    expect(status()).toBe(`You missed at ${coordLabel(water)}. The computer is aiming…`);
    expect(root.querySelectorAll('[id^="computer-"] button').length).toBe(0);

    await computerTurn();
    const onMe = root.querySelectorAll('[id^="player-"].miss, [id^="player-"].hit');
    expect(onMe.length).toBe(1);
    expect(status()).toMatch(/^The computer (missed at|hit your ship at) [A-F][1-6]\. Your turn/);
    expect(timer()).toBe('Your turn: 0:10');

    const target = shipCells[0];
    if (!target) throw new Error('No computer ship');
    await click(enemyCell(target));
    expect(root.querySelector(`#computer-${coordLabel(target)}`)?.classList).toContain('hit');
    expect(root.querySelectorAll('[id^="computer-"].ship').length).toBe(0);
  });

  it("shows each side's score above its board once the battle starts, player first", async () => {
    const { root, game, button, enemyCell, click, computerTurn, placeFleet } = await setup('6x6');
    const card = (name: string) => root.querySelector(`[role="group"][aria-label="${name}"]`);
    /** A card's visible parts (label, points, badge), joined by single spaces. */
    const score = (name: string) =>
      [...(card(name)?.children ?? [])]
        .map((part) => part.textContent?.trim())
        .filter(Boolean)
        .join(' ');
    expect(card('Your score')).toBeNull();

    await placeFleet();
    await click(button('Ready'));
    expect(score('Your score')).toBe('Your score 0 pts');
    expect(score("Computer's score")).toBe("Computer's score 0 pts");
    const order = [...root.querySelectorAll('[role="group"][aria-label$="score"]')].map((c) =>
      c.getAttribute('aria-label'),
    );
    expect(order).toEqual(['Your score', "Computer's score"]);
    expect(card('Your score')?.closest('section')?.querySelector('#player-A1')).not.toBeNull();
    expect(
      card("Computer's score")?.closest('section')?.querySelector('#computer-A1'),
    ).not.toBeNull();

    const target = game.computerBoard()?.ships[0]?.cells[0];
    if (!target) throw new Error('No computer ship');
    await click(enemyCell(target));
    expect(score('Your score')).toBe('Your score 1 pt');

    await computerTurn();
    expect(score("Computer's score")).toMatch(/^Computer's score [01] pts?$/);
  });

  it('shows the four superpowers under each board once the battle starts', async () => {
    const { root, button, click, placeFleet } = await setup('6x6');
    const powers = (name: string) => root.querySelector(`ul[aria-label="${name}"]`);
    const labels = (name: string) =>
      [...(powers(name)?.querySelectorAll('li') ?? [])].map((b) => b.textContent?.trim());
    expect(powers('Your superpowers')).toBeNull();
    expect(powers("Computer's superpowers")).toBeNull();

    await placeFleet();
    await click(button('Ready'));
    const expected = ['Radar', 'Random shots', 'Double Missiles', 'Shield'];
    expect(labels('Your superpowers')).toEqual(expected);
    expect(labels("Computer's superpowers")).toEqual(expected);

    for (const [name, board] of [
      ['Your superpowers', '#player-A1'],
      ["Computer's superpowers", '#computer-A1'],
    ] as const) {
      const row = powers(name);
      const cell = row?.closest('section')?.querySelector(board);
      if (!row || !cell) throw new Error(`${name} is not beside its board`);
      // The row comes after (under) the board in the same column.
      expect(cell.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('scans with the Radar instead of firing, borders the ship squares for RADAR_REVEAL_MS, and scans again', async () => {
    const { fixture, root, game, button, enemyCell, status, click, placeFleet } =
      await setup('6x6');
    await placeFleet();
    await click(button('Ready'));

    // From here the 2-second reveal runs on fake timers, so render synchronously.
    vi.useFakeTimers({
      toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'],
    });
    const press = (el: HTMLElement | null | undefined) => {
      el?.click();
      fixture.detectChanges();
    };
    const radarButton = () =>
      root.querySelector<HTMLButtonElement>('ul[aria-label="Your superpowers"] button');
    const overlay = (cls: string) =>
      [...root.querySelectorAll(`[id^="computer-"].${cls}`)].map((e) => e.id).sort();

    expect(radarButton()?.textContent?.trim()).toBe('Radar');
    expect(root.querySelector('ul[aria-label="Computer\'s superpowers"] button')).toBeNull();

    // Pressing Radar again is the way to cancel aiming.
    press(radarButton());
    expect(radarButton()?.getAttribute('aria-pressed')).toBe('true');
    expect(status()).toMatch(/^Pick a cell to scan/);
    press(radarButton());
    expect(radarButton()?.getAttribute('aria-pressed')).toBe('false');
    expect(status()).not.toMatch(/Pick a cell/);

    const ships = game.computerBoard()?.ships.flatMap((s) => s.cells) ?? [];
    const target = ships[0];
    if (!target) throw new Error('No computer ship');
    press(radarButton());
    press(enemyCell(target));

    const found = radarCross(6, target).filter((c) => ships.some((s) => sameCoord(s, c)));
    expect(overlay('radar')).toEqual(found.map((c) => `computer-${coordLabel(c)}`).sort());
    expect(overlay('scanned')).toHaveLength(11);
    expect(overlay('ship')).toEqual([]);
    expect(game.log()).toEqual([]);
    expect(enemyCell(target)?.getAttribute('aria-label')).toBe(
      `${coordLabel(target)}, water, radar: ship square`,
    );
    const label = coordLabel(target);
    const squares = found.length === 1 ? 'square' : 'squares';
    expect(status()).toBe(
      `Radar: ${found.length} ship ${squares} in row ${label.slice(1)} and column ${label.slice(0, 1)}. Fire when the scan ends.`,
    );

    // No firing, and no second scan, while the borders show.
    press(enemyCell(target));
    expect(game.log()).toEqual([]);
    expect(radarButton()?.disabled).toBe(true);

    vi.advanceTimersByTime(RADAR_REVEAL_MS);
    fixture.detectChanges();
    expect(overlay('radar')).toEqual([]);
    expect(overlay('scanned')).toEqual([]);
    expect(radarButton()?.disabled).toBe(false);

    // Again in the same turn, then the turn's shot.
    press(radarButton());
    press(enemyCell({ row: 5, col: 5 }));
    expect(overlay('scanned')).toHaveLength(11);
    vi.advanceTimersByTime(RADAR_REVEAL_MS);
    fixture.detectChanges();

    press(enemyCell(target));
    expect(game.log()).toHaveLength(1);
    expect(root.querySelector(`#computer-${label}`)?.classList).toContain('hit');
  });

  it('borders a repeat shot red instead of firing again', async () => {
    const { root, button, enemyCell, click, computerTurn, placeFleet, game } = await setup('6x6');
    await placeFleet();
    await click(button('Ready'));
    const first = { row: 0, col: 0 };
    await click(enemyCell(first));
    await computerTurn();

    await click(enemyCell(first));
    expect(root.querySelector('#computer-A1')?.classList).toContain('rejected');
    expect(TestBed.inject(PlayerTurn).active()).toBe(true);
  });

  it('declares the winner, reveals the computer fleet and offers a new game', async () => {
    const { root, game, button, enemyCell, status, timer, click, computerTurn, placeFleet } =
      await setup('6x6');
    await placeFleet();
    await click(button('Ready'));

    for (const target of game.computerBoard()?.ships.flatMap((s) => s.cells) ?? []) {
      if (game.phase() !== 'battle') break;
      await click(enemyCell(target));
      if (game.phase() === 'battle') await computerTurn();
    }

    if (game.winner() === 0) {
      expect(status()).toBe('You win! You sank the whole computer fleet.');
    } else {
      expect(status()).toBe('You lose. The computer sank your fleet.');
    }
    expect(timer()).toBeNull();
    expect(root.querySelectorAll('[id^="computer-"] button').length).toBe(0);
    expect(root.querySelectorAll('[id^="computer-"].sunk').length).toBeGreaterThan(0);
    expect(root.querySelectorAll('ul[aria-label$="superpowers"]').length).toBe(2);

    await click(button('Play again'));
    expect(game.phase()).toBe('placing');
    expect(root.querySelectorAll('ul[aria-label$="superpowers"]').length).toBe(0);
    expect(timer()).toBe('Time left: 5:00');
    expect(root.querySelectorAll('[id^="player-"].ship').length).toBe(0);
  });
});
