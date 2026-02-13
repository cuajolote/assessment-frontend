import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketStoreService } from '../../../core/services/ticket-store.service';
import { ConnectivityService } from '../../../core/services/connectivity.service';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sync-status.component.html',
})
export class SyncStatusComponent {
  private readonly store = inject(TicketStoreService);
  private readonly connectivity = inject(ConnectivityService);

  readonly pendingCount$ = this.store.pendingCount$;
  readonly isOnline$ = this.connectivity.isOnline$;

  async manualSync(): Promise<void> {
    await this.store.syncPendingChanges();
  }
}
