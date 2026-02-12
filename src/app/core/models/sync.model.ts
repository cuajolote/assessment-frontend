import { Ticket } from './ticket.model';

export interface SyncQueueItem {
  id?: number;
  ticketId: string;
  patch: Partial<Ticket>;
  originalUpdatedAt: string;
  timestamp: number;
}

export interface ConflictRecord {
  ticketId: string;
  localVersion: Partial<Ticket>;
  serverVersion: Ticket;
  detectedAt: number;
}

export interface SyncResult {
  synced: number;
  failed: number;
  conflicts: number;
}
