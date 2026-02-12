import { Routes } from '@angular/router';
import { ticketsLoadedResolver } from '../../core/guards/tickets.resolver';

export const TICKET_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ticket-list/ticket-list.component').then(m => m.TicketListComponent),
    resolve: { ticketsLoaded: ticketsLoadedResolver },
  },
];
