import { Component, ChangeDetectionStrategy, inject, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AsyncPipe, TitleCasePipe } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { TicketStoreService } from '../../../core/services/ticket-store.service';
import {
  TicketStatus,
  TicketPriority,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from '../../../core/models/ticket.model';
import { DEFAULT_COLUMNS } from '../../../core/models/filter.model';

@Component({
  selector: 'app-ticket-filters',
  standalone: true,
  imports: [FormsModule, AsyncPipe, TitleCasePipe],
  templateUrl: './ticket-filters.component.html',
  styleUrl: './ticket-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketFiltersComponent implements OnInit {
  private readonly store = inject(TicketStoreService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  readonly filters$ = this.store.filters$;
  readonly allTags$ = this.store.allTags$;
  readonly visibleColumns$ = this.store.visibleColumns$;

  readonly STATUSES = TICKET_STATUSES;
  readonly PRIORITIES = TICKET_PRIORITIES;
  readonly STATUS_LABELS = STATUS_LABELS;
  readonly PRIORITY_LABELS = PRIORITY_LABELS;
  readonly ALL_COLUMNS = DEFAULT_COLUMNS;

  searchText = '';
  showColumnMenu = false;

  ngOnInit(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(text => this.store.setFilters({ searchText: text }));
  }

  onSearchInput(value: string): void {
    this.searchText = value;
    this.searchSubject.next(value);
  }

  toggleStatus(status: TicketStatus, currentStatuses: TicketStatus[]): void {
    const updated = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    this.store.setFilters({ statuses: updated });
  }

  togglePriority(priority: TicketPriority, currentPriorities: TicketPriority[]): void {
    const updated = currentPriorities.includes(priority)
      ? currentPriorities.filter(p => p !== priority)
      : [...currentPriorities, priority];
    this.store.setFilters({ priorities: updated });
  }

  toggleTag(tag: string, currentTags: string[]): void {
    const updated = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    this.store.setFilters({ tags: updated });
  }

  onDateFromChange(value: string): void {
    this.store.setFilters({
      dateRange: { from: value || null, to: this.getCurrentDateTo() },
    });
  }

  onDateToChange(value: string): void {
    this.store.setFilters({
      dateRange: { from: this.getCurrentDateFrom(), to: value || null },
    });
  }

  toggleColumn(column: string): void {
    this.store.toggleColumn(column);
  }

  clearFilters(): void {
    this.searchText = '';
    this.store.resetFilters();
  }

  private getCurrentDateFrom(): string | null {
    return this.store['state'].value.filters.dateRange.from;
  }

  private getCurrentDateTo(): string | null {
    return this.store['state'].value.filters.dateRange.to;
  }
}
