import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { filter, map, take, switchMap, of } from 'rxjs';
import { TicketStoreService } from '../services/ticket-store.service';

export const ticketsLoadedResolver: ResolveFn<boolean> = () => {
  const store = inject(TicketStoreService);

  return store.tickets$.pipe(
    take(1),
    switchMap(tickets => {
      if (tickets.length > 0) {
        return of(true);
      }

      store.loadTickets();

      return store.loading$.pipe(
        filter(loading => !loading),
        map(() => true),
        take(1)
      );
    })
  );
};
