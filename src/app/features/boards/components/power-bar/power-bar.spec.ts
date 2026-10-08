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
    expect(blocks).toEqual(['Radar', 'Random shots', 'Double Missiles', 'Shield']);
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
});
