import type { Routes } from '@angular/router';

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
  { path: '**', redirectTo: '' },
];
