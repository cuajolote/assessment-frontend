import { TestBed } from '@angular/core/testing';
import { OfflineService } from './offline.service';

describe('OfflineService', () => {
  let service: OfflineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OfflineService],
    });
    service = TestBed.inject(OfflineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose pendingCount$ observable', (done) => {
    service.pendingCount$.subscribe(count => {
      expect(typeof count).toBe('number');
      expect(count).toBe(0); // Initial state
      done();
    });
  });
});
