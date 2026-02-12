export type TicketStatus = 'open' | 'in_progress' | 'blocked' | 'closed';
export type TicketPriority = 1 | 2 | 3 | 4 | 5;
export type CustomerTier = 'free' | 'pro' | 'enterprise';

export interface TicketMeta {
  source?: string;
  customerTier?: CustomerTier;
}

export interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  meta?: TicketMeta;
  // internal flags (not from server)
  _pendingSync?: boolean;
  _blockedReason?: string;
}

export const TICKET_STATUSES: TicketStatus[] = ['open', 'in_progress', 'blocked', 'closed'];
export const TICKET_PRIORITIES: TicketPriority[] = [1, 2, 3, 4, 5];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  closed: 'Closed',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  1: 'Critical',
  2: 'High',
  3: 'Medium',
  4: 'Low',
  5: 'Minimal',
};

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  1: 'bg-red-100 text-red-800',
  2: 'bg-orange-100 text-orange-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-blue-100 text-blue-800',
  5: 'bg-gray-100 text-gray-600',
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  blocked: 'bg-red-100 text-red-800',
  closed: 'bg-gray-100 text-gray-600',
};
