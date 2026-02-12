import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, EMPTY } from 'rxjs';
import { map, distinctUntilChanged, shareReplay, catchError, take, switchMap } from 'rxjs/operators';
import { Ticket } from '../models/ticket.model';
import {
  TicketFilters,
  SortConfig,
  INITIAL_FILTERS,
  DEFAULT_COLUMNS,
} from '../models/filter.model';
import { TicketService } from './ticket.service';
import { OfflineService } from './offline.service';
import { ConnectivityService } from './connectivity.service';
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
  private readonly offlineService = inject(OfflineService);
  private readonly connectivityService = inject(ConnectivityService);
  private readonly state = new BehaviorSubject<TicketState>(INITIAL_STATE);

  constructor() {
    // Initialize IndexedDB
    this.offlineService.initDatabase();

    // Auto-sync when reconnecting
    this.connectivityService.isOnline$
      .pipe(
        distinctUntilChanged(),
        switchMap(isOnline => {
          if (isOnline) {
            // When going from offline to online, trigger sync
            return this.offlineService.getPendingChanges().then(pending => {
              if (pending.length > 0) {
                this.syncPendingChanges();
              }
            });
          }
          return EMPTY;
        })
      )
      .subscribe();
  }

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

  readonly pendingCount$ = this.offlineService.pendingCount$;

  // --- Actions ---

  loadTickets(): void {
    this.patchState({ loading: true, error: null });

    this.ticketService
      .getTickets()
      .pipe(
        take(1),
        catchError(() => {
          // Online fetch failed — try loading from IndexedDB cache
          return new Observable<Ticket[]>(subscriber => {
            this.offlineService.getCachedTickets().then(cached => {
              if (cached.length > 0) {
                subscriber.next(cached);
              } else {
                this.patchState({ loading: false, error: 'Failed to load tickets (offline, no cache)' });
              }
              subscriber.complete();
            });
          });
        })
      )
      .subscribe(raw => {
        const tickets = sanitizeTickets(raw);
        this.patchState({ tickets, loading: false });
        // Cache in IndexedDB for offline use
        this.offlineService.cacheTickets(tickets);
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
        this.patchState({
          sort: current.map(s =>
            s.column === column ? { ...s, direction: 'desc' as const } : s
          ),
        });
      } else {
        this.patchState({ sort: current.filter(s => s.column !== column) });
      }
    } else {
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
    const ticket = prev.tickets.find(t => t.id === id);
    const updatedAt = new Date().toISOString();

    const updatedTickets = prev.tickets.map(t =>
      t.id === id ? { ...t, ...patch, updatedAt } : t
    );
    // Optimistic update
    this.patchState({ tickets: updatedTickets });

    this.ticketService
      .updateTicket(id, patch)
      .pipe(
        take(1),
        catchError(() => {
          // Mark as pending sync instead of rolling back
          const withPending = prev.tickets.map(t =>
            t.id === id ? { ...t, ...patch, updatedAt, _pendingSync: true } : t
          );
          this.patchState({ tickets: withPending });

          // Queue the change for later sync
          this.offlineService.queueChange({
            ticketId: id,
            patch,
            originalUpdatedAt: ticket?.updatedAt ?? updatedAt,
            timestamp: Date.now(),
          });

          return EMPTY;
        })
      )
      .subscribe(updated => {
        // Update cache with server response
        const current = this.state.value.tickets.find(t => t.id === id);
        if (current) {
          this.offlineService.updateCachedTicket(current);
        }
      });
  }

  async syncPendingChanges(): Promise<void> {
    const pending = await this.offlineService.getPendingChanges();
    if (pending.length === 0) return;

    // Simple strategy: last-write-wins, no conflict resolution UI
    for (const item of pending) {
      try {
        await new Promise<void>((resolve) => {
          this.ticketService
            .updateTicket(item.ticketId, item.patch)
            .pipe(take(1))
            .subscribe({
              next: () => {
                this.offlineService.removePendingChange(item.id!);
                const tickets = this.state.value.tickets.map(t =>
                  t.id === item.ticketId ? { ...t, _pendingSync: false } : t
                );
                this.patchState({ tickets });
                resolve();
              },
              error: () => {
                // On error, just remove from queue (last-write-wins)
                this.offlineService.removePendingChange(item.id!);
                resolve();
              },
            });
        });
      } catch {
        // Continue with next item
      }
    }
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

    if (filters.searchText) {
      const term = filters.searchText.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(term));
    }

    if (filters.statuses.length > 0) {
      result = result.filter(t => filters.statuses.includes(t.status));
    }

    if (filters.priorities.length > 0) {
      result = result.filter(t => filters.priorities.includes(t.priority));
    }

    if (filters.tags.length > 0) {
      result = result.filter(t =>
        filters.tags.some(tag => t.tags.includes(tag))
      );
    }

    if (filters.dateRange.from) {
      const from = new Date(filters.dateRange.from).getTime();
      result = result.filter(t => new Date(t.createdAt).getTime() >= from);
    }
    if (filters.dateRange.to) {
      const to = new Date(filters.dateRange.to).getTime();
      result = result.filter(t => new Date(t.createdAt).getTime() <= to);
    }

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
