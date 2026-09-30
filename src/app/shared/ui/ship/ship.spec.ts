import { TestBed } from '@angular/core/testing';
import { Ship } from './ship';

describe('Ship', () => {
  it('renders one block per length unit, labelled as an image', async () => {
    const fixture = TestBed.createComponent(Ship);
    fixture.componentRef.setInput('length', 4);
    fixture.componentRef.setInput('label', 'Ship, 4 blocks');
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('.block').length).toBe(4);
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('Ship, 4 blocks');
  });

  it('applies and changes the colour', async () => {
    const fixture = TestBed.createComponent(Ship);
    fixture.componentRef.setInput('length', 3);
    fixture.componentRef.setInput('label', 'Ship');
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.style.getPropertyValue('--ship-color')).toBe('');

    fixture.componentRef.setInput('color', 'blue');
    await fixture.whenStable();
    expect(host.style.getPropertyValue('--ship-color')).toBe('blue');
  });
});
