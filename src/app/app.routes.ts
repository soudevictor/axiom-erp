import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('@/features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: 'inventory',
    loadComponent: () =>
      import('@/features/inventory/inventory.component').then(
        (m) => m.InventoryComponent
      ),
  },
  {
    path: 'treasury',
    loadComponent: () =>
      import('@/features/treasury/treasury.component').then(
        (m) => m.TreasuryComponent
      ),
  },
  {
    path: 'partners',
    loadComponent: () =>
      import('@/features/partners/partners.component').then(
        (m) => m.PartnersComponent
      ),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
