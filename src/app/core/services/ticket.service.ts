import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { Ticket } from '../models/ticket.model';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly http = inject(HttpClient);

  getTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>('data/tickets.json');
  }

  updateTicket(id: string, patch: Partial<Ticket>): Observable<Ticket> {
    // Simulated backend response with a small delay
    const updated = { id, ...patch, updatedAt: new Date().toISOString() } as Ticket;
    return of(updated).pipe(delay(300 + Math.random() * 400));
  }
}
