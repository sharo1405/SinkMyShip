import { TestBed } from '@angular/core/testing';
import { RNG } from '@core/models/rng';
import type { BoardOptionId } from '@core/models/board-option';
import { SetupStore } from '@core/services/setup-store';
import { PLACEMENT_TIME_LIMIT_MS, seededRng } from '@sinkmyship/game';
import { BattlePage } from './battle-page';

async function setup(board: BoardOptionId) {
  TestBed.configureTestingModule({ providers: [{ provide: RNG, useValue: seededRng(1) }] });
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
  const click = async (el: HTMLElement | null | undefined) => {
    el?.click();
    await fixture.whenStable();
  };
  return { fixture, root, trayShip, cell, remaining, removeButton, timer, status, click };
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
    const { root, trayShip, remaining } = await setup('8x8');

    for (const n of [3, 4, 5, 6]) expect(trayShip(`${n}-block ship`)).toBeDefined();
    expect(root.querySelectorAll('[id^="computer-"].ship').length).toBe(3 + 4 + 5 + 6);
    expect(root.querySelectorAll('[id^="player-"].ship').length).toBe(0);
    expect(remaining()).toBeNull();
  });

  it('selects a ship, counts down while placing it block by block, then hides the counter', async () => {
    const { root, trayShip, cell, remaining, click } = await setup('4x4');

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
    const { root, trayShip, cell, remaining, click } = await setup('4x4');

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
    const { root, trayShip, cell, removeButton, status, click } = await setup('4x4');
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

  it('counts down five minutes, then places the fleet itself and locks placement', async () => {
    const { fixture, root, trayShip, removeButton, timer, status } = await setup('6x6');
    expect(timer()).toBe('Time left: 5:00');

    vi.advanceTimersByTime(90_000);
    await fixture.whenStable();
    expect(timer()).toBe('Time left: 3:30');

    vi.advanceTimersByTime(PLACEMENT_TIME_LIMIT_MS);
    await fixture.whenStable();

    expect(timer()).toBeNull();
    expect(status()).toBe('Time is up. Your remaining ships were placed for you.');
    expect(root.querySelectorAll('[id^="player-"].ship').length).toBe(3 + 4 + 5);
    expect(root.querySelector('#player-A1 button')).toBeNull();
    expect(trayShip('3-block ship, placed')?.disabled).toBe(true);
    expect(removeButton()?.disabled).toBe(true);
  });
});
