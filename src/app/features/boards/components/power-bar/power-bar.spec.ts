import { TestBed } from '@angular/core/testing';
import { SUPERPOWERS } from '@core/models/superpowers';
import { SUPERPOWER_IDS, type SuperpowerId } from '@sinkmyship/game';
import { PowerBar } from './power-bar';

describe('PowerBar', () => {
  it('shows one block per power, in order, inside a labelled list', async () => {
    const fixture = TestBed.createComponent(PowerBar);
    fixture.componentRef.setInput('label', 'Your superpowers');
    fixture.componentRef.setInput('powers', SUPERPOWERS);
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const list = root.querySelector('ul[aria-label="Your superpowers"]');
    const blocks = [...(list?.querySelectorAll('li') ?? [])].map((b) => b.textContent?.trim());
    expect(blocks).toEqual(['Radar', 'Shotgun', 'Double Missiles', 'Shield']);
    expect(root.querySelector('button')).toBeNull();
  });

  it('lists every superpower the rules define, in the same order', () => {
    expect(SUPERPOWERS.map((p) => p.id)).toEqual(SUPERPOWER_IDS);
  });

  it('makes only the powers with a state into buttons, pressed while active', async () => {
    const fixture = TestBed.createComponent(PowerBar);
    fixture.componentRef.setInput('label', 'Your superpowers');
    fixture.componentRef.setInput('powers', SUPERPOWERS);
    fixture.componentRef.setInput('states', { radar: 'ready' });
    const activated: SuperpowerId[] = [];
    fixture.componentInstance.activate.subscribe((id) => activated.push(id));
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const buttons = () => [...root.querySelectorAll('button')];
    expect(buttons().map((b) => b.textContent?.trim())).toEqual(['Radar']);
    expect(buttons()[0]?.getAttribute('aria-pressed')).toBe('false');
    buttons()[0]?.click();
    expect(activated).toEqual(['radar']);

    fixture.componentRef.setInput('states', { radar: 'active' });
    await fixture.whenStable();
    expect(buttons()[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(buttons()[0]?.disabled).toBe(false);

    fixture.componentRef.setInput('states', { radar: 'unavailable' });
    await fixture.whenStable();
    expect(buttons()[0]?.disabled).toBe(true);
  });

  it('shows the red action button under an active power that has one', async () => {
    const fixture = TestBed.createComponent(PowerBar);
    fixture.componentRef.setInput('label', 'Your superpowers');
    fixture.componentRef.setInput('powers', SUPERPOWERS);
    fixture.componentRef.setInput('states', { radar: 'ready', shotgun: 'ready' });
    const ran: SuperpowerId[] = [];
    fixture.componentInstance.runAction.subscribe((id) => ran.push(id));
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const action = () =>
      root.querySelector<HTMLButtonElement>('button[aria-label="Click to fire the Shotgun"]');
    expect(action()).toBeNull();

    fixture.componentRef.setInput('states', { radar: 'ready', shotgun: 'active' });
    await fixture.whenStable();
    expect(action()?.textContent?.trim()).toBe('Click');
    // Directly under its own block.
    expect(action()?.closest('li')?.textContent).toContain('Shotgun');
    action()?.click();
    expect(ran).toEqual(['shotgun']);

    // Radar has no action button, even when active.
    fixture.componentRef.setInput('states', { radar: 'active', shotgun: 'ready' });
    await fixture.whenStable();
    expect(root.querySelectorAll('button')).toHaveLength(2);
  });

  it('shows the action button grey and disabled until the power is ready', async () => {
    const fixture = TestBed.createComponent(PowerBar);
    fixture.componentRef.setInput('label', 'Your superpowers');
    fixture.componentRef.setInput('powers', SUPERPOWERS);
    fixture.componentRef.setInput('states', { 'double-missiles': 'active' });
    fixture.componentRef.setInput('actionDisabled', { 'double-missiles': true });
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const action = () =>
      root.querySelector<HTMLButtonElement>('button[aria-label="Click to fire Double Missiles"]');
    expect(action()?.textContent?.trim()).toBe('Click');
    expect(action()?.disabled).toBe(true);

    fixture.componentRef.setInput('actionDisabled', { 'double-missiles': false });
    await fixture.whenStable();
    expect(action()?.disabled).toBe(false);
  });

  it("shows an 'on' power pressed and disabled, with no action button", async () => {
    const fixture = TestBed.createComponent(PowerBar);
    fixture.componentRef.setInput('label', 'Your superpowers');
    fixture.componentRef.setInput('powers', SUPERPOWERS);
    fixture.componentRef.setInput('states', { shield: 'on' });
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const buttons = [...root.querySelectorAll('button')];
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Shield']);
    expect(buttons[0]?.disabled).toBe(true);
    expect(buttons[0]?.getAttribute('aria-pressed')).toBe('true');
  });
});
