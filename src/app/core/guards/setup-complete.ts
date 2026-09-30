import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SetupStore } from '@core/services/setup-store';

/**
 * Lets the battle open only once a board and a ship colour have been chosen; otherwise sends
 * the player back to the first setup step. Setup lives in memory, so a reload lands there too.
 */
export const setupCompleteGuard: CanActivateFn = () => {
  const store = inject(SetupStore);
  return store.boardOption() !== null && store.shipColor() !== null
    ? true
    : inject(Router).createUrlTree(['/setup']);
};
