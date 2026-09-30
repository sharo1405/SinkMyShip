import { TestBed } from '@angular/core/testing';
import { ShipColorPage } from './ship-color-page';

async function setup() {
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
  it('shows blue, green and purple tiles, 3/4/5-block ships and a disabled confirm button', async () => {
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
});
