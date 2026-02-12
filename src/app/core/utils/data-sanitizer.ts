import { Ticket, TicketPriority, TicketStatus, TICKET_STATUSES, TICKET_PRIORITIES } from '../models/ticket.model';

export function sanitizeTickets(raw: any[]): Ticket[] {
  if (!Array.isArray(raw)) return [];

  const ticketMap = new Map<string, Ticket>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;

    const ticket = sanitizeSingleTicket(item);

    // Deduplicate by ID: keep the one with the latest updatedAt
    const existing = ticketMap.get(ticket.id);
    if (!existing || ticket.updatedAt > existing.updatedAt) {
      ticketMap.set(ticket.id, ticket);
    }
  }

  return Array.from(ticketMap.values());
}

function sanitizeSingleTicket(raw: any): Ticket {
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : generateFallbackId(),
    title: sanitizeString(raw.title, 'Untitled Ticket'),
    status: sanitizeStatus(raw.status),
    priority: sanitizePriority(raw.priority),
    assignee: raw.assignee && typeof raw.assignee === 'string' ? raw.assignee.trim() : undefined,
    createdAt: sanitizeDate(raw.createdAt),
    updatedAt: sanitizeDate(raw.updatedAt),
    tags: sanitizeTags(raw.tags),
    meta: sanitizeMeta(raw.meta),
  };
}

function sanitizeString(value: any, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

function sanitizeStatus(value: any): TicketStatus {
  if (typeof value === 'string' && TICKET_STATUSES.includes(value as TicketStatus)) {
    return value as TicketStatus;
  }
  return 'open';
}

function sanitizePriority(value: any): TicketPriority {
  const num = Number(value);
  if (TICKET_PRIORITIES.includes(num as TicketPriority)) {
    return num as TicketPriority;
  }
  return 3;
}

export function sanitizeDate(value: any): string {
  if (!value || typeof value !== 'string') {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  // Reject dates too far in the future (more than 1 year from now)
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (parsed > oneYearFromNow) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

export function sanitizeTags(tags: any): string[] {
  if (!Array.isArray(tags)) return [];

  const normalized = new Set<string>();
  for (const tag of tags) {
    if (typeof tag === 'string') {
      const clean = tag.trim().toLowerCase();
      if (clean.length > 0) {
        normalized.add(clean);
      }
    }
  }
  return Array.from(normalized);
}

function sanitizeMeta(meta: any): Ticket['meta'] | undefined {
  if (!meta || typeof meta !== 'object') return undefined;

  const tiers = ['free', 'pro', 'enterprise'];
  return {
    source: typeof meta.source === 'string' ? meta.source : undefined,
    customerTier: tiers.includes(meta.customerTier) ? meta.customerTier : undefined,
  };
}

let idCounter = 0;
function generateFallbackId(): string {
  idCounter++;
  return `TKT-fallback-${Date.now()}-${idCounter}`;
}
