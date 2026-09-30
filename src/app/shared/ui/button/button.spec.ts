import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button } from './button';

@Component({
  imports: [Button],
  template: `<button appButton type="button">Fire</button><a appButton href="/x">Go</a>`,
})
class Host {}

describe('Button', () => {
  it('keeps native button and link semantics and projects the label', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    const button = root.querySelector('button');
    const link = root.querySelector('a');
    expect(button?.textContent?.trim()).toBe('Fire');
    expect(button?.classList).toContain('app-button');
    expect(link?.textContent?.trim()).toBe('Go');
    expect(link?.classList).toContain('app-button');
  });
});
