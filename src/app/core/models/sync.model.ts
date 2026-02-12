import { Ticket } from './ticket.model';

export interface SyncQueueItem {
  id?: number;
  ticketId: string;
  patch: Partial<Ticket>;
  originalUpdatedAt: string;
  timestamp: number;
}
