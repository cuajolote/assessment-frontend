import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tickets',
    pathMatch: 'full',
  },
  {
    path: 'tickets',
    loadChildren: () =>
      import('./features/tickets/tickets.routes').then(m => m.TICKET_ROUTES),
  },
];
