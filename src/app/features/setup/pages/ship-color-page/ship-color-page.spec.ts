import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { BoardOptionId } from '@core/models/board-option';
import { SetupStore } from '@core/services/setup-store';
import { ShipColorPage } from './ship-color-page';

async function setup(board: BoardOptionId | null = '6x6') {
  if (board) TestBed.inject(SetupStore).chooseBoard(board);
  const fixture = TestBed.createComponent(ShipColorPage);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const colorButton = (name: string) =>
    root.querySelector<HTMLButtonElement>(`[role="group"] button[aria-label="${name}"]`);
  const ships = () => [...root.querySelectorAll<HTMLElement>('[role="img"]')];
  const confirm = () =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Choose the color');
  return { fixture, colorButton, ships, confirm };
}

describe('ShipColorPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('shows blue, green and purple tiles, the 6x6 fleet and a disabled confirm button', async () => {
    const { colorButton, ships, confirm } = await setup();

    for (const name of ['Blue', 'Green', 'Purple']) {
      expect(colorButton(name)?.getAttribute('aria-pressed')).toBe('false');
    }
    expect(ships().map((s) => s.getAttribute('aria-label'))).toEqual([
      '3-block ship',
      '4-block ship',
      '5-block ship',
    ]);
    expect(confirm()?.disabled).toBe(true);
  });

  it.each([
    ['4x4', ['2-block ship', '3-block ship']],
    ['6x6', ['3-block ship', '4-block ship', '5-block ship']],
    ['8x8', ['3-block ship', '4-block ship', '5-block ship', '6-block ship']],
  ] as const)('previews the %s fleet', async (board, expected) => {
    const { ships } = await setup(board);

    expect(ships().map((s) => s.getAttribute('aria-label'))).toEqual(expected);
  });

  it('shows no ships until a board is chosen', async () => {
    const { ships } = await setup(null);

    expect(ships()).toEqual([]);
  });

  it('selects only the clicked colour and recolours every ship each time', async () => {
    const { fixture, colorButton, ships, confirm } = await setup();

    colorButton('Green')?.click();
    await fixture.whenStable();
    expect(colorButton('Green')?.getAttribute('aria-pressed')).toBe('true');
    expect(colorButton('Green')?.classList).toContain('selected');
    expect(colorButton('Blue')?.getAttribute('aria-pressed')).toBe('false');
    for (const ship of ships()) {
      expect(ship.style.getPropertyValue('--ship-color')).toBe('var(--ship-green)');
    }
    expect(confirm()?.disabled).toBe(false);

    colorButton('Purple')?.click();
    await fixture.whenStable();
    expect(colorButton('Purple')?.getAttribute('aria-pressed')).toBe('true');
    expect(colorButton('Green')?.getAttribute('aria-pressed')).toBe('false');
    for (const ship of ships()) {
      expect(ship.style.getPropertyValue('--ship-color')).toBe('var(--ship-purple)');
    }
    expect(ships()[0]?.getAttribute('aria-label')).toBe('3-block ship, purple');
  });

  it('goes to the battle when the colour is confirmed', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const { fixture, colorButton, confirm } = await setup();

    colorButton('Blue')?.click();
    await fixture.whenStable();
    confirm()?.click();

    expect(navigate).toHaveBeenCalledWith(['/battle']);
  });
});
