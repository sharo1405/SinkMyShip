import type { Routes } from '@angular/router';

/** Setup steps, in order: board, then ship colour. */
export const SETUP_ROUTES: Routes = [
  {
    path: '',
    title: 'Choose your board | SinkMyShip',
    loadComponent: () =>
      import('./pages/board-size-page/board-size-page').then((m) => m.BoardSizePage),
  },
  {
    path: 'color',
    title: 'Choose your ship color | SinkMyShip',
    loadComponent: () =>
      import('./pages/ship-color-page/ship-color-page').then((m) => m.ShipColorPage),
  },
];
