import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Ticket, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '../../../core/models/ticket.model';
import { SortConfig } from '../../../core/models/filter.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-ticket-table',
  standalone: true,
  imports: [ScrollingModule, BadgeComponent, RelativeTimePipe],
  templateUrl: './ticket-table.component.html',
  styleUrl: './ticket-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketTableComponent {
  tickets = input.required<Ticket[]>();
  visibleColumns = input.required<string[]>();
  sort = input<SortConfig[]>([]);

  ticketSelect = output<Ticket>();
  sortChange = output<string>();

  readonly STATUS_LABELS = STATUS_LABELS;
  readonly STATUS_COLORS = STATUS_COLORS;
  readonly PRIORITY_LABELS = PRIORITY_LABELS;
  readonly PRIORITY_COLORS = PRIORITY_COLORS;

  trackById(_index: number, ticket: Ticket): string {
    return ticket.id;
  }

  isColumnVisible(col: string): boolean {
    return this.visibleColumns().includes(col);
  }

  getSortDirection(column: string): 'asc' | 'desc' | null {
    const s = this.sort().find(s => s.column === column);
    return s ? s.direction : null;
  }

  getSortIndex(column: string): number {
    const idx = this.sort().findIndex(s => s.column === column);
    return idx >= 0 ? idx + 1 : -1;
  }

  onSort(column: string): void {
    this.sortChange.emit(column);
  }

  onSelectTicket(ticket: Ticket): void {
    this.ticketSelect.emit(ticket);
  }
}
