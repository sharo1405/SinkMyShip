import { TestBed } from '@angular/core/testing';
import { COMPUTER_SHOT_DELAY_MS } from '@core/models/game-timing';
import { RNG } from '@core/models/rng';
import type { BoardOptionId } from '@core/models/board-option';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerTurn } from '@core/services/player-turn/player-turn';
import { SHIELD_ALERT_MS } from '@core/services/player-shield/player-shield';
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
  /** Cells of the computer's board not fired at yet, in reading order. */
  const openCells = (): Coord[] =>
    (game.enemyView()?.cells ?? []).flatMap((cells, row) =>
      cells.flatMap((c, col) => (c === 'unknown' ? [{ row, col }] : [])),
    );
  /**
   * Earns the player score points: hits a computer ship square (taken from the bottom-right)
   * each turn, letting the computer take its turns in between. Three rounds earn 6 points.
   */
  const earnPoints = async (rounds = 3) => {
    const board = game.computerBoard();
    const ships = (board?.ships.flatMap((s) => s.cells) ?? [])
      .filter((c) => !board?.shots.some((s) => sameCoord(s, c)))
      .sort((a, b) => b.row - a.row || b.col - a.col);
    for (const at of ships.slice(0, rounds)) {
      await click(enemyCell(at));
      await computerTurn();
    }
  };
  /** The player's power button whose name is `name`. */
  const power = (name: string) =>
    [...root.querySelectorAll<HTMLButtonElement>('ul[aria-label="Your superpowers"] button')].find(
      (b) => b.querySelector('.name')?.textContent?.trim() === name,
    );
  /** The player's score card, e.g. "Your score 4 pts -2 Radar". */
  const playerScore = () =>
    [...(root.querySelector('[role="group"][aria-label="Your score"]')?.children ?? [])]
      .map((part) => part.textContent?.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join(' ');
  return {
    fixture,
    openCells,
    earnPoints,
    power,
    playerScore,
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

    expect(timer()).toBe('Your turn: 0:25');
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

    expect(timer()).toBe('Your turn: 0:25');
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
    expect(timer()).toBe('Your turn: 0:25');

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
    const labels = (name: string, part = 'name') =>
      [...(powers(name)?.querySelectorAll(`li .${part}`) ?? [])].map((b) => b.textContent?.trim());
    expect(powers('Your superpowers')).toBeNull();
    expect(powers("Computer's superpowers")).toBeNull();

    await placeFleet();
    await click(button('Ready'));
    const expected = ['Radar', 'Shotgun', 'Double Missiles', 'Shield'];
    expect(labels('Your superpowers')).toEqual(expected);
    expect(labels("Computer's superpowers")).toEqual(expected);
    const prices = ['2 pts', '5 pts', '4 pts', '6 pts'];
    expect(labels('Your superpowers', 'price')).toEqual(prices);
    expect(labels("Computer's superpowers", 'price')).toEqual(prices);
    // Everyone starts at 0 points, so every power is out of reach.
    const playerButtons = [
      ...root.querySelectorAll<HTMLButtonElement>('ul[aria-label="Your superpowers"] button'),
    ];
    expect(playerButtons.map((b) => b.disabled)).toEqual([true, true, true, true]);
    expect(playerButtons[0]?.getAttribute('aria-label')).toBe('Radar, costs 2 points, you have 0');

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

  it('enables a power only once the player has its price: Radar at 2 points', async () => {
    const { button, click, placeFleet, earnPoints, power, playerScore } = await setup('6x6');
    await placeFleet();
    await click(button('Ready'));
    expect(power('Radar')?.disabled).toBe(true);

    await earnPoints(1);
    expect(power('Radar')?.disabled).toBe(true);
    await earnPoints(1);
    expect(playerScore()).toMatch(/^Your score 2 pts/);
    expect(power('Radar')?.disabled).toBe(false);
    expect(power('Radar')?.getAttribute('aria-label')).toBe('Radar, costs 2 points');
    expect(power('Shotgun')?.disabled).toBe(true);
    expect(power('Shotgun')?.classList).toContain('unaffordable');
    expect(power('Shotgun')?.getAttribute('aria-label')).toBe(
      'Shotgun, costs 5 points, you have 2',
    );
  });

  it('scans with the Radar for 2 points instead of firing, shows the ship squares briefly, and scans again', async () => {
    const s = await setup('6x6');
    const { fixture, root, game, enemyCell, status, click } = s;
    await s.placeFleet();
    await click(s.button('Ready'));
    await s.earnPoints();
    expect(s.playerScore()).toMatch(/^Your score 6 pts/);

    // From here the reveal runs on fake timers, so render synchronously.
    vi.useFakeTimers({
      toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'],
    });
    const press = (el: HTMLElement | null | undefined) => {
      el?.click();
      fixture.detectChanges();
    };
    const radarButton = () => s.power('Radar');
    const overlay = (cls: string) =>
      [...root.querySelectorAll(`[id^="computer-"].${cls}`)].map((e) => e.id).sort();
    expect(root.querySelector('ul[aria-label="Computer\'s superpowers"] button')).toBeNull();

    // Pressing Radar again is the way to cancel aiming, and it costs nothing.
    press(radarButton());
    expect(radarButton()?.getAttribute('aria-pressed')).toBe('true');
    expect(status()).toMatch(/^Pick a cell to scan/);
    press(radarButton());
    expect(radarButton()?.getAttribute('aria-pressed')).toBe('false');
    expect(status()).not.toMatch(/Pick a cell/);
    expect(s.playerScore()).toMatch(/^Your score 6 pts/);
    const logLength = game.log().length;

    const ships = game.computerBoard()?.ships.flatMap((c) => c.cells) ?? [];
    const open = s.openCells();
    const target = ships.find((c) => open.some((o) => sameCoord(o, c)));
    if (!target) throw new Error('No unshot computer ship square');
    press(radarButton());
    press(enemyCell(target));

    const found = radarCross(6, target).filter((c) => ships.some((sq) => sameCoord(sq, c)));
    expect(overlay('radar')).toEqual(found.map((c) => `computer-${coordLabel(c)}`).sort());
    expect(overlay('scanned')).toHaveLength(11);
    expect(overlay('ship')).toEqual([]);
    expect(
      game
        .log()
        .slice(logLength)
        .map((e) => e.kind),
    ).toEqual(['power']);
    expect(s.playerScore()).toBe('Your score 4 pts -2 Radar');
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
    expect(
      game
        .log()
        .slice(logLength)
        .map((e) => e.kind),
    ).toEqual(['power']);
    expect(radarButton()?.disabled).toBe(true);

    vi.advanceTimersByTime(RADAR_REVEAL_MS);
    fixture.detectChanges();
    expect(overlay('radar')).toEqual([]);
    expect(overlay('scanned')).toEqual([]);
    expect(radarButton()?.disabled).toBe(false);

    // Again in the same turn, for 2 more points, then the turn's shot.
    press(radarButton());
    press(enemyCell({ row: 5, col: 5 }));
    expect(overlay('scanned')).toHaveLength(11);
    expect(s.playerScore()).toBe('Your score 2 pts -2 Radar');
    vi.advanceTimersByTime(RADAR_REVEAL_MS);
    fixture.detectChanges();

    press(enemyCell(target));
    expect(
      game
        .log()
        .slice(logLength)
        .map((e) => e.kind),
    ).toEqual(['power', 'power', 'shot']);
    expect(root.querySelector(`#computer-${label}`)?.classList).toContain('hit');
  });

  it('arms Shotgun with a red Click button that fires 5 shots as the whole turn, then pays', async () => {
    const s = await setup('6x6');
    const { root, game, status, timer, click, power } = s;
    await s.placeFleet();
    await click(s.button('Ready'));
    await s.earnPoints();
    const fireButton = () =>
      root.querySelector<HTMLButtonElement>('button[aria-label="Click to fire the Shotgun"]');
    const computerMarks = () =>
      root.querySelectorAll('[id^="computer-"].miss, [id^="computer-"].hit, [id^="computer-"].sunk')
        .length;
    const logLength = game.log().length;

    // Pressing the block shows the red Click button; pressing it again hides it, free.
    expect(fireButton()).toBeNull();
    await click(power('Shotgun'));
    expect(power('Shotgun')?.getAttribute('aria-pressed')).toBe('true');
    expect(fireButton()?.textContent?.trim()).toBe('Click');
    expect(status()).toMatch(/^Press the red Click button/);
    await click(power('Shotgun'));
    expect(fireButton()).toBeNull();
    expect(game.log()).toHaveLength(logLength);
    expect(s.playerScore()).toMatch(/^Your score 6 pts/);

    // Only one power at a time.
    await click(power('Radar'));
    await click(power('Shotgun'));
    expect(power('Radar')?.getAttribute('aria-pressed')).toBe('false');
    expect(power('Shotgun')?.getAttribute('aria-pressed')).toBe('true');
    await click(power('Radar'));
    expect(power('Shotgun')?.getAttribute('aria-pressed')).toBe('false');
    expect(fireButton()).toBeNull();
    await click(power('Radar'));

    const marksBefore = computerMarks();
    await click(power('Shotgun'));
    await click(fireButton());

    expect(
      game
        .log()
        .slice(logLength)
        .map((e) => e.kind),
    ).toEqual(['shot', 'shot', 'shot', 'shot', 'shot', 'power']);
    expect(computerMarks()).toBe(marksBefore + 5);
    expect(fireButton()).toBeNull();
    expect(timer()).toBe("Computer's turn");
    expect(s.playerScore()).toMatch(/ -\d Shotgun$/);
    expect(status()).toMatch(
      /^Shotgun: \d hits?, \d (miss|misses)\.( You sank a \d-block ship!)* The computer is aiming…$/,
    );
  });

  it('arms Double Missiles, picks 2 targets on the board, then fires both as the turn', async () => {
    const s = await setup('6x6');
    const { root, game, enemyCell, status, timer, click, power } = s;
    await s.placeFleet();
    await click(s.button('Ready'));
    await s.earnPoints();
    const fireButton = () =>
      root.querySelector<HTMLButtonElement>('button[aria-label="Click to fire Double Missiles"]');
    const targeted = () =>
      [...root.querySelectorAll('[id^="computer-"].targeted')].map((c) => c.id).sort();
    const id = (c: Coord) => `computer-${coordLabel(c)}`;
    const [a, b, c] = s.openCells();
    if (!a || !b || !c) throw new Error('Not enough open cells');
    const logLength = game.log().length;

    // Arming shows a grey, disabled Click.
    await click(power('Double Missiles'));
    expect(power('Double Missiles')?.getAttribute('aria-pressed')).toBe('true');
    expect(fireButton()?.disabled).toBe(true);
    expect(status()).toMatch(/^Pick 2 cells .*\(0\/2\)/);

    // Board clicks pick and unpick targets without firing; a third pick is ignored.
    await click(enemyCell(a));
    expect(targeted()).toEqual([id(a)]);
    expect(enemyCell(a)?.getAttribute('aria-label')).toBe(`${coordLabel(a)}, water, targeted`);
    expect(status()).toMatch(/\(1\/2\)/);
    await click(enemyCell(a));
    expect(targeted()).toEqual([]);
    await click(enemyCell(b));
    await click(enemyCell(a));
    await click(enemyCell(c));
    expect(targeted()).toEqual([id(a), id(b)].sort());
    expect(game.log()).toHaveLength(logLength);

    // Two picks enable Click.
    expect(fireButton()?.disabled).toBe(false);
    expect(status()).toMatch(/^Press Click to fire both missiles\./);

    // Pressing the block again cancels and clears the picks, free; other powers take over.
    await click(power('Double Missiles'));
    expect(fireButton()).toBeNull();
    expect(targeted()).toEqual([]);
    expect(s.playerScore()).toMatch(/^Your score 6 pts/);
    await click(power('Double Missiles'));
    await click(power('Shotgun'));
    expect(power('Double Missiles')?.getAttribute('aria-pressed')).toBe('false');
    await click(power('Radar'));
    expect(power('Shotgun')?.getAttribute('aria-pressed')).toBe('false');
    await click(power('Double Missiles'));
    expect(power('Radar')?.getAttribute('aria-pressed')).toBe('false');
    expect(fireButton()?.disabled).toBe(true);

    await click(enemyCell(b));
    await click(enemyCell(a));
    await click(fireButton());

    expect(
      game
        .log()
        .slice(logLength)
        .map((e) => (e.kind === 'shot' ? coordLabel(e.at) : e.kind)),
    ).toEqual([coordLabel(b), coordLabel(a), 'power']);
    expect(fireButton()).toBeNull();
    expect(targeted()).toEqual([]);
    expect(timer()).toBe("Computer's turn");
    expect(s.playerScore()).toMatch(/ -\d Double Missiles$/);
    expect(status()).toMatch(
      /^Double Missiles: \d hits?, \d (miss|misses)\.( You sank a \d-block ship!)* The computer is aiming…$/,
    );
  });

  it("raises the Shield for 6 points, blocks the computer's next shot with a red flash, then drops", async () => {
    const s = await setup('6x6');
    const { fixture, root, game, enemyCell, status, click } = s;
    await s.placeFleet();
    await click(s.button('Ready'));
    await s.earnPoints();

    // From here the computer's move and the flash run on fake timers; render synchronously.
    vi.useFakeTimers({
      toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'],
    });
    const press = (el: HTMLElement | null | undefined) => {
      el?.click();
      fixture.detectChanges();
    };
    const shieldButton = () => s.power('Shield');
    const caption = () =>
      root.querySelector('#player-A1')?.closest('table')?.querySelector('caption');
    const playerBoard = () => root.querySelector('app-player-board');
    /** The ring overlay around the player's cells (not the caption or labels). */
    const ring = () => playerBoard()?.querySelector('.frame > .cell-ring') ?? null;
    const playerMarks = () =>
      root.querySelectorAll('[id^="player-"].miss, [id^="player-"].hit, [id^="player-"].sunk')
        .length;

    press(shieldButton());
    expect(caption()?.textContent?.trim()).toBe('Your board: Shield up');
    expect(ring()?.classList).toContain('shielded');
    expect(playerBoard()?.classList).not.toContain('shielded');
    expect(shieldButton()?.disabled).toBe(true);
    expect(shieldButton()?.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('ul[aria-label="Your superpowers"] .action')).toBeNull();
    expect(s.playerScore()).toBe('Your score 0 pts -6 Shield');
    expect(game.isTurnOf(0)).toBe(true);

    // The player still fires; then the computer's shot hits the shield.
    const marksBefore = playerMarks();
    press(enemyCell(s.openCells()[0]));
    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    expect(game.log().at(-1)?.kind).toBe('blocked');
    expect(playerMarks()).toBe(marksBefore);
    expect(status()).toBe(
      "Your shield blocked the computer's shot! Your turn: fire at the computer's board.",
    );
    expect(ring()?.classList).toContain('alert');
    expect(ring()?.classList).not.toContain('shielded');
    expect(playerBoard()?.classList).not.toContain('alert');
    expect(caption()?.textContent?.trim()).toBe('Your board');

    vi.advanceTimersByTime(SHIELD_ALERT_MS);
    fixture.detectChanges();
    expect(ring()).toBeNull();
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
