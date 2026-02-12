import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { openDB, IDBPDatabase } from 'idb';
import { Ticket } from '../models/ticket.model';
import { SyncQueueItem } from '../models/sync.model';

const DB_NAME = 'ticket-admin-db';
const DB_VERSION = 1;

@Injectable({ providedIn: 'root' })
export class OfflineService {
  private db: IDBPDatabase | null = null;
  private readonly pendingCountSubject = new BehaviorSubject<number>(0);
  readonly pendingCount$: Observable<number> = this.pendingCountSubject.asObservable();

  async initDatabase(): Promise<void> {
    if (this.db) return;

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tickets')) {
          db.createObjectStore('tickets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync-queue')) {
          const syncStore = db.createObjectStore('sync-queue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncStore.createIndex('by-timestamp', 'timestamp');
        }
      },
    });

    await this.refreshCounts();
  }

  // --- Ticket cache ---

  async cacheTickets(tickets: Ticket[]): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction('tickets', 'readwrite');
    const store = tx.objectStore('tickets');

    await store.clear();
    for (const ticket of tickets) {
      await store.put(ticket);
    }
    await tx.done;
  }

  async getCachedTickets(): Promise<Ticket[]> {
    const db = await this.getDb();
    return db.getAll('tickets');
  }

  async updateCachedTicket(ticket: Ticket): Promise<void> {
    const db = await this.getDb();
    await db.put('tickets', ticket);
  }

  // --- Sync queue ---

  async queueChange(item: Omit<SyncQueueItem, 'id'>): Promise<void> {
    const db = await this.getDb();
    await db.add('sync-queue', item);
    await this.refreshCounts();
  }

  async getPendingChanges(): Promise<SyncQueueItem[]> {
    const db = await this.getDb();
    return db.getAllFromIndex('sync-queue', 'by-timestamp');
  }

  async removePendingChange(id: number): Promise<void> {
    const db = await this.getDb();
    await db.delete('sync-queue', id);
    await this.refreshCounts();
  }

  async clearSyncQueue(): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction('sync-queue', 'readwrite');
    await tx.objectStore('sync-queue').clear();
    await tx.done;
    await this.refreshCounts();
  }

  // --- Helpers ---

  private async getDb(): Promise<IDBPDatabase> {
    if (!this.db) {
      await this.initDatabase();
    }
    return this.db!;
  }

  private async refreshCounts(): Promise<void> {
    try {
      const db = await this.getDb();
      const count = await db.count('sync-queue');
      this.pendingCountSubject.next(count);
    } catch {
      // DB might not be ready yet
    }
  }
}
