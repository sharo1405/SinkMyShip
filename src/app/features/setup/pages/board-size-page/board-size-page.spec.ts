import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SetupStore } from '@core/services/setup-store/setup-store';
import { BoardSizePage } from './board-size-page';

describe('BoardSizePage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('shows 4x4, 6x6 and 8x8 board tiles', async () => {
    const fixture = TestBed.createComponent(BoardSizePage);
    await fixture.whenStable();
    const group = (fixture.nativeElement as HTMLElement).querySelector('[role="group"]');

    expect(group?.getAttribute('aria-label')).toBe('Board');
    const labels = [...(group?.querySelectorAll('button') ?? [])].map((b) => b.textContent?.trim());
    expect(labels).toEqual(['4x4', '6x6', '8x8']);
  });

  it('records the choice and navigates to the colour step', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(BoardSizePage);
    await fixture.whenStable();

    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === '6x6')
      ?.click();

    expect(TestBed.inject(SetupStore).boardOption()).toBe('6x6');
    expect(navigate).toHaveBeenCalledWith(['/setup/color']);
  });
});
