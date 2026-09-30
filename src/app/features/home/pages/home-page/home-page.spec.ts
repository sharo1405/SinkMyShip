import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePage } from './home-page';

describe('HomePage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('renders the heading input and a Start link to /setup', async () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.componentRef.setInput('heading', 'Welcome');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Welcome');
    const start = [...root.querySelectorAll('a')].find((a) => a.textContent?.trim() === 'Start');
    expect(start?.getAttribute('href')).toBe('/setup');
  });
});
