import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { TicketStoreService } from '../../../core/services/ticket-store.service';
import { TicketTableComponent } from '../ticket-table/ticket-table.component';
import { Ticket } from '../../../core/models/ticket.model';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, TicketTableComponent],
  templateUrl: './ticket-list.component.html',
  styleUrl: './ticket-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketListComponent {
  private readonly store = inject(TicketStoreService);

  readonly filteredTickets$ = this.store.filteredTickets$;
  readonly visibleColumns$ = this.store.visibleColumns$;
  readonly sort$ = this.store.sort$;
  readonly loading$ = this.store.loading$;
  readonly tickets$ = this.store.tickets$;

  onSortChange(column: string): void {
    this.store.toggleSortColumn(column);
  }

  onTicketSelect(ticket: Ticket): void {
    this.store.selectTicket(ticket.id);
  }
}
