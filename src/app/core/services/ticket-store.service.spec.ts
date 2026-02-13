import { TestBed } from '@angular/core/testing';
import { of, throwError, firstValueFrom, BehaviorSubject } from 'rxjs';
import { take } from 'rxjs/operators';
import { TicketStoreService } from './ticket-store.service';
import { TicketService } from './ticket.service';
import { OfflineService } from './offline.service';
import { ConnectivityService } from './connectivity.service';
import { Ticket } from '../models/ticket.model';

const MOCK_TICKETS: Ticket[] = [
  {
    id: 'TKT-001',
    title: 'Server crash on login',
    status: 'open',
    priority: 1,
    assignee: 'Alice',
    createdAt: '2024-06-15T10:00:00.000Z',
    updatedAt: '2024-06-16T10:00:00.000Z',
    tags: ['bug', 'backend'],
  },
  {
    id: 'TKT-002',
    title: 'Add dark mode support',
    status: 'in_progress',
    priority: 3,
    assignee: 'Bob',
    createdAt: '2024-07-01T08:00:00.000Z',
    updatedAt: '2024-07-02T08:00:00.000Z',
    tags: ['feature', 'frontend'],
  },
  {
    id: 'TKT-003',
    title: 'Fix payment processing error',
    status: 'blocked',
    priority: 2,
    createdAt: '2024-05-10T12:00:00.000Z',
    updatedAt: '2024-05-11T12:00:00.000Z',
    tags: ['bug', 'urgent'],
  },
  {
    id: 'TKT-004',
    title: 'Update documentation for API v2',
    status: 'closed',
    priority: 5,
    assignee: 'Diana',
    createdAt: '2024-03-20T09:00:00.000Z',
    updatedAt: '2024-04-01T09:00:00.000Z',
    tags: ['documentation'],
  },
  {
    id: 'TKT-005',
    title: 'Mobile layout broken on Safari',
    status: 'open',
    priority: 2,
    assignee: 'Carlos',
    createdAt: '2024-08-01T15:00:00.000Z',
    updatedAt: '2024-08-02T15:00:00.000Z',
    tags: ['bug', 'frontend', 'mobile'],
  },
];

describe('TicketStoreService', () => {
  let store: TicketStoreService;
  let ticketServiceSpy: { getTickets: ReturnType<typeof jest.fn>; updateTicket: ReturnType<typeof jest.fn> };
  let offlineServiceSpy: any;
  let connectivityServiceSpy: any;

  beforeEach(() => {
    ticketServiceSpy = {
      getTickets: jest.fn().mockReturnValue(of(MOCK_TICKETS)),
      updateTicket: jest.fn().mockReturnValue(of({})),
    };

    offlineServiceSpy = {
      initDatabase: jest.fn().mockResolvedValue(undefined),
      cacheTickets: jest.fn().mockResolvedValue(undefined),
      getCachedTickets: jest.fn().mockResolvedValue([]),
      updateCachedTicket: jest.fn().mockResolvedValue(undefined),
      queueChange: jest.fn().mockResolvedValue(undefined),
      getPendingChanges: jest.fn().mockResolvedValue([]),
      clearSyncQueue: jest.fn().mockResolvedValue(undefined),
      pendingCount$: of(0),
    };

    connectivityServiceSpy = {
      isOnline$: new BehaviorSubject(true),
    };

    TestBed.configureTestingModule({
      providers: [
        TicketStoreService,
        { provide: TicketService, useValue: ticketServiceSpy },
        { provide: OfflineService, useValue: offlineServiceSpy },
        { provide: ConnectivityService, useValue: connectivityServiceSpy },
      ],
    });

    store = TestBed.inject(TicketStoreService);
  });

  describe('loadTickets', () => {
    it('should load and store tickets', async () => {
      store.loadTickets();
      const tickets = await firstValueFrom(store.tickets$.pipe(take(1)));
      expect(tickets.length).toBe(MOCK_TICKETS.length);
    });

    it('should set loading to false after load', async () => {
      store.loadTickets();
      const loading = await firstValueFrom(store.loading$.pipe(take(1)));
      expect(loading).toBe(false);
    });

  });

  describe('filters', () => {
    beforeEach(() => {
      store.loadTicketsFromData(MOCK_TICKETS);
    });

    it('should filter by search text', async () => {
      store.setFilters({ searchText: 'server crash' });
      const tickets = await firstValueFrom(store.filteredTickets$.pipe(take(1)));
      expect(tickets.length).toBe(1);
      expect(tickets[0].id).toBe('TKT-001');
    });

    it('should filter by status', async () => {
      store.setFilters({ statuses: ['open'] });
      const tickets = await firstValueFrom(store.filteredTickets$.pipe(take(1)));
      expect(tickets.every(t => t.status === 'open')).toBe(true);
      expect(tickets.length).toBe(2);
    });

    it('should filter by multiple statuses', async () => {
      store.setFilters({ statuses: ['open', 'blocked'] });
      const tickets = await firstValueFrom(store.filteredTickets$.pipe(take(1)));
      expect(tickets.every(t => t.status === 'open' || t.status === 'blocked')).toBe(true);
      expect(tickets.length).toBe(3);
    });

    it('should filter by priority', async () => {
      store.setFilters({ priorities: [1, 2] });
      const tickets = await firstValueFrom(store.filteredTickets$.pipe(take(1)));
      expect(tickets.every(t => t.priority <= 2)).toBe(true);
      expect(tickets.length).toBe(3);
    });

    it('should filter by tags', async () => {
      store.setFilters({ tags: ['frontend'] });
      const tickets = await firstValueFrom(store.filteredTickets$.pipe(take(1)));
      expect(tickets.every(t => t.tags.includes('frontend'))).toBe(true);
      expect(tickets.length).toBe(2);
    });

    it('should combine multiple filters', async () => {
      store.setFilters({ statuses: ['open'], tags: ['bug'] });
      const tickets = await firstValueFrom(store.filteredTickets$.pipe(take(1)));
      expect(tickets.length).toBe(2);
      expect(tickets.every(t => t.status === 'open' && t.tags.includes('bug'))).toBe(true);
    });

    it('should filter by date range', async () => {
      store.setFilters({
        dateRange: { from: '2024-07-01T00:00:00.000Z', to: '2024-08-31T00:00:00.000Z' },
      });
      const tickets = await firstValueFrom(store.filteredTickets$.pipe(take(1)));
      expect(tickets.length).toBe(2);
    });

    it('should reset filters', async () => {
      store.setFilters({ statuses: ['closed'] });
      store.resetFilters();
      const tickets = await firstValueFrom(store.filteredTickets$.pipe(take(1)));
      expect(tickets.length).toBe(MOCK_TICKETS.length);
    });
  });

  describe('sorting', () => {
    beforeEach(() => {
      store.loadTicketsFromData(MOCK_TICKETS);
    });

    it('should sort by priority ascending', async () => {
      store.setSort([{ column: 'priority', direction: 'asc' }]);
      const tickets = await firstValueFrom(store.filteredTickets$.pipe(take(1)));
      for (let i = 1; i < tickets.length; i++) {
        expect(tickets[i].priority).toBeGreaterThanOrEqual(tickets[i - 1].priority);
      }
    });

    it('should sort by priority descending', async () => {
      store.setSort([{ column: 'priority', direction: 'desc' }]);
      const tickets = await firstValueFrom(store.filteredTickets$.pipe(take(1)));
      for (let i = 1; i < tickets.length; i++) {
        expect(tickets[i].priority).toBeLessThanOrEqual(tickets[i - 1].priority);
      }
    });

    it('should toggle sort: none -> asc -> desc -> none', async () => {
      store.setSort([]);

      store.toggleSortColumn('title');
      let sort = await firstValueFrom(store.sort$.pipe(take(1)));
      expect(sort).toEqual([{ column: 'title', direction: 'asc' }]);

      store.toggleSortColumn('title');
      sort = await firstValueFrom(store.sort$.pipe(take(1)));
      expect(sort).toEqual([{ column: 'title', direction: 'desc' }]);

      store.toggleSortColumn('title');
      sort = await firstValueFrom(store.sort$.pipe(take(1)));
      expect(sort).toEqual([]);
    });
  });

  describe('ticket selection', () => {
    beforeEach(() => {
      store.loadTicketsFromData(MOCK_TICKETS);
    });

    it('should select a ticket by id', async () => {
      store.selectTicket('TKT-002');
      const ticket = await firstValueFrom(store.selectedTicket$.pipe(take(1)));
      expect(ticket).not.toBeNull();
      expect(ticket!.id).toBe('TKT-002');
    });

    it('should return null for no selection', async () => {
      store.selectTicket(null);
      const ticket = await firstValueFrom(store.selectedTicket$.pipe(take(1)));
      expect(ticket).toBeNull();
    });
  });

  describe('updateTicket (optimistic)', () => {
    beforeEach(() => {
      store.loadTicketsFromData(MOCK_TICKETS);
    });

    it('should update ticket optimistically', async () => {
      store.updateTicket('TKT-001', { title: 'Updated title here' });
      const tickets = await firstValueFrom(store.tickets$.pipe(take(1)));
      const updated = tickets.find(t => t.id === 'TKT-001');
      expect(updated!.title).toBe('Updated title here');
    });

  });

  describe('column visibility', () => {
    it('should toggle column visibility', async () => {
      store.toggleColumn('tags');
      let columns = await firstValueFrom(store.visibleColumns$.pipe(take(1)));
      expect(columns).not.toContain('tags');

      store.toggleColumn('tags');
      columns = await firstValueFrom(store.visibleColumns$.pipe(take(1)));
      expect(columns).toContain('tags');
    });
  });

  describe('allTags$', () => {
    it('should extract unique sorted tags from all tickets', async () => {
      store.loadTicketsFromData(MOCK_TICKETS);
      const tags = await firstValueFrom(store.allTags$.pipe(take(1)));
      expect(tags).toContain('bug');
      expect(tags).toContain('frontend');
      expect(tags).toContain('backend');
      expect(tags).toContain('documentation');
      const sorted = [...tags].sort();
      expect(tags).toEqual(sorted);
    });
  });
});
