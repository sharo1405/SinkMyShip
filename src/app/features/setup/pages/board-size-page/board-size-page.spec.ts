import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SetupStore } from '@core/services/setup-store';
import { BoardSizePage } from './board-size-page';

describe('BoardSizePage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('shows three board tiles', async () => {
    const fixture = TestBed.createComponent(BoardSizePage);
    await fixture.whenStable();
    const group = (fixture.nativeElement as HTMLElement).querySelector('[role="group"]');

    expect(group?.getAttribute('aria-label')).toBe('Board');
    const labels = [...(group?.querySelectorAll('button') ?? [])].map((b) =>
      b.getAttribute('aria-label'),
    );
    expect(labels).toEqual(['Board option 1', 'Board option 2', 'Board option 3']);
  });

  it('records the choice and navigates to the colour step', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(BoardSizePage);
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[aria-label="Board option 2"]')
      ?.click();

    expect(TestBed.inject(SetupStore).boardOption()).toBe('option-2');
    expect(navigate).toHaveBeenCalledWith(['/setup/color']);
  });
});
