import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, EMPTY } from 'rxjs';
import { map, distinctUntilChanged, shareReplay, catchError, take } from 'rxjs/operators';
import { Ticket } from '../models/ticket.model';
import {
  TicketFilters,
  SortConfig,
  INITIAL_FILTERS,
  DEFAULT_COLUMNS,
} from '../models/filter.model';
import { TicketService } from './ticket.service';
import { sanitizeTickets } from '../utils/data-sanitizer';

interface TicketState {
  tickets: Ticket[];
  filters: TicketFilters;
  sort: SortConfig[];
  visibleColumns: string[];
  selectedTicketId: string | null;
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: TicketState = {
  tickets: [],
  filters: INITIAL_FILTERS,
  sort: [{ column: 'createdAt', direction: 'desc' }],
  visibleColumns: DEFAULT_COLUMNS,
  selectedTicketId: null,
  loading: false,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class TicketStoreService {
  private readonly ticketService = inject(TicketService);
  private readonly state = new BehaviorSubject<TicketState>(INITIAL_STATE);

  // --- Selectors ---

  readonly loading$ = this.select(s => s.loading);
  readonly error$ = this.select(s => s.error);
  readonly visibleColumns$ = this.select(s => s.visibleColumns);
  readonly filters$ = this.select(s => s.filters);
  readonly sort$ = this.select(s => s.sort);
  readonly selectedTicketId$ = this.select(s => s.selectedTicketId);

  readonly tickets$ = this.select(s => s.tickets).pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly selectedTicket$: Observable<Ticket | null> = combineLatest([
    this.tickets$,
    this.selectedTicketId$,
  ]).pipe(
    map(([tickets, id]) => (id ? tickets.find(t => t.id === id) ?? null : null)),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly filteredTickets$: Observable<Ticket[]> = combineLatest([
    this.tickets$,
    this.filters$,
    this.sort$,
  ]).pipe(
    map(([tickets, filters, sort]) => this.applyFiltersAndSort(tickets, filters, sort)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly allTags$: Observable<string[]> = this.tickets$.pipe(
    map(tickets => {
      const tagSet = new Set<string>();
      tickets.forEach(t => t.tags.forEach(tag => tagSet.add(tag)));
      return Array.from(tagSet).sort();
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // --- Actions ---

  loadTickets(): void {
    this.patchState({ loading: true, error: null });

    this.ticketService
      .getTickets()
      .pipe(
        take(1),
        catchError(err => {
          this.patchState({ loading: false, error: 'Failed to load tickets' });
          return EMPTY;
        })
      )
      .subscribe(raw => {
        const tickets = sanitizeTickets(raw);
        this.patchState({ tickets, loading: false });
      });
  }

  loadTicketsFromData(tickets: Ticket[]): void {
    this.patchState({ tickets, loading: false, error: null });
  }

  setFilters(filters: Partial<TicketFilters>): void {
    const current = this.state.value.filters;
    this.patchState({ filters: { ...current, ...filters } });
  }

  resetFilters(): void {
    this.patchState({ filters: INITIAL_FILTERS });
  }

  setSort(sort: SortConfig[]): void {
    this.patchState({ sort });
  }

  toggleSortColumn(column: string): void {
    const current = this.state.value.sort;
    const existing = current.find(s => s.column === column);

    if (existing) {
      if (existing.direction === 'asc') {
        // asc -> desc
        this.patchState({
          sort: current.map(s =>
            s.column === column ? { ...s, direction: 'desc' as const } : s
          ),
        });
      } else {
        // desc -> remove
        this.patchState({ sort: current.filter(s => s.column !== column) });
      }
    } else {
      // add as asc
      this.patchState({ sort: [...current, { column, direction: 'asc' }] });
    }
  }

  toggleColumn(column: string): void {
    const current = this.state.value.visibleColumns;
    const updated = current.includes(column)
      ? current.filter(c => c !== column)
      : [...current, column];
    this.patchState({ visibleColumns: updated });
  }

  selectTicket(id: string | null): void {
    this.patchState({ selectedTicketId: id });
  }

  updateTicket(id: string, patch: Partial<Ticket>): void {
    const prev = this.state.value;
    const updatedTickets = prev.tickets.map(t =>
      t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
    );
    // Optimistic update
    this.patchState({ tickets: updatedTickets });

    this.ticketService
      .updateTicket(id, patch)
      .pipe(
        take(1),
        catchError(() => {
          // Rollback on failure
          this.patchState({ tickets: prev.tickets });
          return EMPTY;
        })
      )
      .subscribe();
  }

  // --- Private helpers ---

  private select<T>(selector: (state: TicketState) => T): Observable<T> {
    return this.state.asObservable().pipe(
      map(selector),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  private patchState(patch: Partial<TicketState>): void {
    this.state.next({ ...this.state.value, ...patch });
  }

  private applyFiltersAndSort(
    tickets: Ticket[],
    filters: TicketFilters,
    sort: SortConfig[]
  ): Ticket[] {
    let result = tickets;

    // Text search
    if (filters.searchText) {
      const term = filters.searchText.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(term));
    }

    // Status filter
    if (filters.statuses.length > 0) {
      result = result.filter(t => filters.statuses.includes(t.status));
    }

    // Priority filter
    if (filters.priorities.length > 0) {
      result = result.filter(t => filters.priorities.includes(t.priority));
    }

    // Tags filter
    if (filters.tags.length > 0) {
      result = result.filter(t =>
        filters.tags.some(tag => t.tags.includes(tag))
      );
    }

    // Date range filter
    if (filters.dateRange.from) {
      const from = new Date(filters.dateRange.from).getTime();
      result = result.filter(t => new Date(t.createdAt).getTime() >= from);
    }
    if (filters.dateRange.to) {
      const to = new Date(filters.dateRange.to).getTime();
      result = result.filter(t => new Date(t.createdAt).getTime() <= to);
    }

    // Multi-column sort
    if (sort.length > 0) {
      result = [...result].sort((a, b) => {
        for (const s of sort) {
          const cmp = this.compareValues(
            (a as unknown as Record<string, unknown>)[s.column],
            (b as unknown as Record<string, unknown>)[s.column]
          );
          if (cmp !== 0) {
            return s.direction === 'asc' ? cmp : -cmp;
          }
        }
        return 0;
      });
    }

    return result;
  }

  private compareValues(a: unknown, b: unknown): number {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;

    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    return String(a).localeCompare(String(b));
  }
}
