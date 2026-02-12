import { sanitizeTickets, sanitizeDate, sanitizeTags } from './data-sanitizer';
import { Ticket } from '../models/ticket.model';

describe('DataSanitizer', () => {
  const validTicket = {
    id: 'TKT-001',
    title: 'Valid ticket',
    status: 'open',
    priority: 3,
    createdAt: '2024-06-15T10:00:00.000Z',
    updatedAt: '2024-06-16T10:00:00.000Z',
    tags: ['bug', 'frontend'],
  };

  describe('sanitizeTickets', () => {
    it('should return clean tickets unchanged', () => {
      const result = sanitizeTickets([validTicket]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('TKT-001');
      expect(result[0].title).toBe('Valid ticket');
      expect(result[0].status).toBe('open');
      expect(result[0].priority).toBe(3);
    });

    it('should handle empty array', () => {
      expect(sanitizeTickets([])).toEqual([]);
    });

    it('should handle non-array input', () => {
      expect(sanitizeTickets(null as any)).toEqual([]);
      expect(sanitizeTickets(undefined as any)).toEqual([]);
    });

    it('should skip null/undefined items', () => {
      const result = sanitizeTickets([validTicket, null, undefined]);
      expect(result).toHaveLength(1);
    });

    it('should deduplicate tickets by ID keeping latest updatedAt', () => {
      const older = { ...validTicket, updatedAt: '2024-01-01T00:00:00.000Z', title: 'Old' };
      const newer = { ...validTicket, updatedAt: '2024-12-01T00:00:00.000Z', title: 'New' };
      const result = sanitizeTickets([older, newer]);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('New');
    });

    it('should default invalid status to open', () => {
      const bad = { ...validTicket, status: 'pending' };
      const result = sanitizeTickets([bad]);
      expect(result[0].status).toBe('open');
    });

    it('should default invalid priority to 3', () => {
      const bad = { ...validTicket, priority: 10 };
      const result = sanitizeTickets([bad]);
      expect(result[0].priority).toBe(3);
    });

    it('should default missing title to Untitled Ticket', () => {
      const bad = { ...validTicket, id: 'TKT-NOTITLE', title: undefined };
      const result = sanitizeTickets([bad]);
      expect(result[0].title).toBe('Untitled Ticket');
    });

    it('should generate fallback ID for tickets without ID', () => {
      const bad = { ...validTicket, id: '' };
      const result = sanitizeTickets([bad]);
      expect(result[0].id).toContain('TKT-fallback');
    });
  });

  describe('sanitizeDate', () => {
    it('should pass through valid ISO dates', () => {
      const date = '2024-06-15T10:00:00.000Z';
      expect(sanitizeDate(date)).toBe(date);
    });

    it('should fallback invalid date strings', () => {
      const result = sanitizeDate('not-a-date');
      expect(new Date(result).getTime()).not.toBeNaN();
    });

    it('should fallback empty strings', () => {
      const result = sanitizeDate('');
      expect(new Date(result).getTime()).not.toBeNaN();
    });

    it('should fallback null/undefined', () => {
      expect(new Date(sanitizeDate(null)).getTime()).not.toBeNaN();
      expect(new Date(sanitizeDate(undefined)).getTime()).not.toBeNaN();
    });

    it('should reject dates too far in the future', () => {
      const futureDate = '2030-01-01T00:00:00.000Z';
      const result = sanitizeDate(futureDate);
      expect(result).not.toBe(futureDate);
    });
  });

  describe('sanitizeTags', () => {
    it('should normalize tags to lowercase and trim', () => {
      expect(sanitizeTags(['Bug', ' Frontend ', 'API'])).toEqual(['bug', 'frontend', 'api']);
    });

    it('should remove duplicates after normalization', () => {
      expect(sanitizeTags(['Bug', 'bug', 'BUG'])).toEqual(['bug']);
    });

    it('should filter out empty strings', () => {
      expect(sanitizeTags(['bug', '', '  ', 'api'])).toEqual(['bug', 'api']);
    });

    it('should handle non-array input', () => {
      expect(sanitizeTags(null)).toEqual([]);
      expect(sanitizeTags(undefined)).toEqual([]);
      expect(sanitizeTags('bug')).toEqual([]);
    });

    it('should filter out non-string items', () => {
      expect(sanitizeTags(['bug', 123, null, 'api'])).toEqual(['bug', 'api']);
    });
  });
});
