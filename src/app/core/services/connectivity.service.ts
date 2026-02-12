import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent, merge, map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly onlineSubject = new BehaviorSubject<boolean>(navigator.onLine);

  readonly isOnline$: Observable<boolean> = this.onlineSubject.asObservable();

  constructor() {
    merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).subscribe(status => this.onlineSubject.next(status));
  }
}
