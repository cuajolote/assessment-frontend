import { TicketPriority, TicketStatus } from './ticket.model';

export interface TicketFilters {
  searchText: string;
  statuses: TicketStatus[];
  priorities: TicketPriority[];
  tags: string[];
  dateRange: {
    from: string | null;
    to: string | null;
  };
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

export const INITIAL_FILTERS: TicketFilters = {
  searchText: '',
  statuses: [],
  priorities: [],
  tags: [],
  dateRange: {
    from: null,
    to: null,
  },
};

export const DEFAULT_COLUMNS: string[] = [
  'id',
  'title',
  'status',
  'priority',
  'assignee',
  'createdAt',
  'tags',
];
