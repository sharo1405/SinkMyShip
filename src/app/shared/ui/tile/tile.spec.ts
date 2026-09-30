import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Tile } from './tile';

@Component({
  imports: [Tile],
  template: `
    <button appTile type="button" aria-label="Plain"></button>
    <button appTile type="button" aria-label="Toggle" [pressed]="on()" color="red"></button>
  `,
})
class Host {
  readonly on = signal(false);
}

describe('Tile', () => {
  it('is a plain button unless pressed is set', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const plain = (fixture.nativeElement as HTMLElement).querySelector('[aria-label="Plain"]');

    expect(plain?.hasAttribute('aria-pressed')).toBe(false);
    expect(plain?.classList).not.toContain('selected');
  });

  it('reflects pressed as aria-pressed and the selected class, and applies the colour', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '[aria-label="Toggle"]',
    );

    expect(toggle?.getAttribute('aria-pressed')).toBe('false');
    expect(toggle?.style.getPropertyValue('--tile-color')).toBe('red');

    fixture.componentInstance.on.set(true);
    await fixture.whenStable();
    expect(toggle?.getAttribute('aria-pressed')).toBe('true');
    expect(toggle?.classList).toContain('selected');
  });
});
