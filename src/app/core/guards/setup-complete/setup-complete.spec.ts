import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  UrlTree,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
} from '@angular/router';
import { SetupStore } from '@core/services/setup-store/setup-store';
import { setupCompleteGuard } from './setup-complete';

function runGuard(): ReturnType<typeof setupCompleteGuard> {
  return TestBed.runInInjectionContext(() =>
    setupCompleteGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}

describe('setupCompleteGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('redirects to /setup until both a board and a colour are chosen', () => {
    const store = TestBed.inject(SetupStore);
    const router = TestBed.inject(Router);

    let result = runGuard();
    expect(result instanceof UrlTree && router.serializeUrl(result)).toBe('/setup');

    store.chooseBoard('6x6');
    result = runGuard();
    expect(result instanceof UrlTree && router.serializeUrl(result)).toBe('/setup');

    store.chooseShipColor('blue');
    expect(runGuard()).toBe(true);
  });
});
