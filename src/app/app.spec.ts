import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

function heading(harness: RouterTestingHarness): string | undefined {
  return (harness.routeNativeElement as HTMLElement).querySelector('h1')?.textContent?.trim();
}

describe('App routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding())],
    });
  });

  it('shows only the Welcome heading and a Start link on the default route', async () => {
    const harness = await RouterTestingHarness.create('/');
    const root = harness.routeNativeElement as HTMLElement;

    expect(heading(harness)).toBe('Welcome');
    const links = root.querySelectorAll('a');
    expect(links.length).toBe(1);
    expect(links[0]?.textContent?.trim()).toBe('Start');
  });

  it('walks Start -> choose board -> choose ship colour -> battle', async () => {
    const harness = await RouterTestingHarness.create('/');
    const root = () => harness.routeNativeElement as HTMLElement;
    const button = (name: string) =>
      [...root().querySelectorAll('button')].find(
        (b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name,
      );

    root().querySelector('a')?.click();
    await harness.fixture.whenStable();
    expect(heading(harness)).toBe('Choose your board');

    button('6x6')?.click();
    await harness.fixture.whenStable();
    expect(heading(harness)).toBe('Choose your ship color');

    button('Blue')?.click();
    await harness.fixture.whenStable();
    button('Choose the color')?.click();
    await harness.fixture.whenStable();
    expect(heading(harness)).toBe('Battle');
    expect(root().querySelector('#player-F6')).not.toBeNull();
    expect(root().querySelector('#computer-F6')).not.toBeNull();
  });

  it('sends /battle back to the board step when setup is incomplete', async () => {
    const harness = await RouterTestingHarness.create('/battle');
    expect(heading(harness)).toBe('Choose your board');
  });
});
