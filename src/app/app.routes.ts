import type { Routes } from '@angular/router';
import { setupCompleteGuard } from '@core/guards/setup-complete/setup-complete';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'SinkMyShip',
    data: { heading: 'Welcome' },
    loadComponent: () => import('@features/home/pages/home-page/home-page').then((m) => m.HomePage),
  },
  {
    path: 'setup',
    loadChildren: () => import('@features/setup/setup.routes').then((m) => m.SETUP_ROUTES),
  },
  {
    path: 'battle',
    title: 'Battle | SinkMyShip',
    canActivate: [setupCompleteGuard],
    loadComponent: () =>
      import('@features/boards/pages/battle-page/battle-page').then((m) => m.BattlePage),
  },
  { path: '**', redirectTo: '' },
];
