/**
 * Ticket data generator
 * Generates 10,500 tickets with intentionally bad data for testing data sanitization.
 *
 * Run: npx ts-node scripts/generate-tickets.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const TOTAL_TICKETS = 10500;
const BAD_DATE_COUNT = 200;
const MISSING_FIELD_COUNT = 200;
const INCONSISTENT_TAG_COUNT = 200;
const DUPLICATE_ID_COUNT = 100;

const STATUSES = ['open', 'in_progress', 'blocked', 'closed'] as const;
const PRIORITIES = [1, 2, 3, 4, 5] as const;
const TIERS = ['free', 'pro', 'enterprise'] as const;
const SOURCES = ['email', 'web', 'api', 'phone', 'chat', 'slack'];

const TAGS = [
  'bug', 'feature', 'urgent', 'backend', 'frontend',
  'security', 'performance', 'documentation', 'ux', 'api',
  'database', 'auth', 'deployment', 'monitoring', 'refactor',
  'mobile', 'infrastructure', 'testing', 'accessibility', 'design',
  'billing', 'onboarding', 'integration', 'analytics', 'compliance',
];

const ASSIGNEES = [
  'Alice Johnson', 'Bob Smith', 'Carlos Garcia', 'Diana Chen',
  'Erik Müller', 'Fatima Al-Hassan', 'George Kim', 'Hannah Patel',
  'Ivan Petrov', 'Julia Santos', 'Kevin O\'Brien', 'Laura Svensson',
  'Marco Rossi', 'Nina Takahashi', 'Oscar Fernandez', 'Patricia Wood',
  'Raj Sharma', 'Sofia Martinez', 'Thomas Anderson', 'Uma Krishnan',
];

const TITLE_PREFIXES = [
  'Fix', 'Update', 'Investigate', 'Implement', 'Resolve',
  'Optimize', 'Add', 'Remove', 'Refactor', 'Debug',
  'Review', 'Configure', 'Deploy', 'Migrate', 'Test',
];

const TITLE_SUBJECTS = [
  'login page authentication flow',
  'database connection pooling timeout',
  'payment processing error handling',
  'user dashboard loading performance',
  'email notification delivery system',
  'API rate limiting configuration',
  'file upload size validation',
  'search index rebuild process',
  'session management timeout policy',
  'cache invalidation strategy',
  'error logging and monitoring setup',
  'password reset token expiration',
  'data export CSV formatting',
  'webhook retry mechanism',
  'user role permissions matrix',
  'SSL certificate renewal process',
  'mobile responsive layout issues',
  'third-party API integration errors',
  'batch job scheduling conflicts',
  'memory leak in background workers',
  'cross-browser compatibility fixes',
  'localization string translations',
  'audit log retention policy',
  'backup restoration procedure',
  'load balancer health checks',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function randomSubset<T>(arr: readonly T[], min: number, max: number): T[] {
  const count = randomInt(min, max);
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'TKT-';
  for (let i = 0; i < 8; i++) {
    id += chars[randomInt(0, chars.length - 1)];
  }
  return id;
}

function randomDate(startYear: number, endYear: number): string {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start)).toISOString();
}

function generateCleanTicket(id: string): Record<string, any> {
  const createdAt = randomDate(2023, 2025);
  const updatedAt = new Date(
    new Date(createdAt).getTime() + randomInt(0, 30 * 24 * 60 * 60 * 1000)
  ).toISOString();

  const ticket: Record<string, any> = {
    id,
    title: `${randomItem(TITLE_PREFIXES)} ${randomItem(TITLE_SUBJECTS)}`,
    status: randomItem(STATUSES),
    priority: randomItem(PRIORITIES),
    createdAt,
    updatedAt,
    tags: randomSubset(TAGS, 1, 4),
  };

  // 70% chance of having an assignee
  if (Math.random() < 0.7) {
    ticket.assignee = randomItem(ASSIGNEES);
  }

  // 60% chance of having meta
  if (Math.random() < 0.6) {
    ticket.meta = {
      source: randomItem(SOURCES),
      customerTier: randomItem(TIERS),
    };
  }

  return ticket;
}

function generateBadDateTicket(id: string): Record<string, any> {
  const ticket = generateCleanTicket(id);
  const badDates = [
    'not-a-date',
    '2024-13-45',
    '2024/01/01',
    '',
    'yesterday',
    '1234567890',
    'null',
    '2024-02-30T00:00:00.000Z',
    'Invalid Date',
    '00-00-0000',
  ];
  ticket.createdAt = randomItem(badDates);
  if (Math.random() > 0.5) {
    ticket.updatedAt = randomItem(badDates);
  }
  return ticket;
}

function generateMissingFieldTicket(id: string): Record<string, any> {
  const ticket = generateCleanTicket(id);
  const fieldsToRemove = ['title', 'status', 'priority', 'tags'];
  const toRemove = randomSubset(fieldsToRemove, 1, 2);
  toRemove.forEach(field => delete ticket[field]);
  return ticket;
}

function generateInconsistentTagTicket(id: string): Record<string, any> {
  const ticket = generateCleanTicket(id);
  // Mixed case, whitespace, duplicates
  const messyTags = [
    ['Bug', 'bug', 'BUG'],
    [' frontend ', 'Frontend', 'FRONTEND'],
    ['urgent', 'URGENT', '  urgent  '],
    ['api', 'API', 'Api', ' api'],
    ['', '  ', 'bug', 'bug'],
  ];
  ticket.tags = randomItem(messyTags);
  return ticket;
}

function main(): void {
  const tickets: Record<string, any>[] = [];
  const ids: string[] = [];

  // Generate unique IDs first
  for (let i = 0; i < TOTAL_TICKETS; i++) {
    ids.push(generateId());
  }

  let index = 0;

  // Bad dates
  for (let i = 0; i < BAD_DATE_COUNT && index < TOTAL_TICKETS; i++, index++) {
    tickets.push(generateBadDateTicket(ids[index]));
  }

  // Missing fields
  for (let i = 0; i < MISSING_FIELD_COUNT && index < TOTAL_TICKETS; i++, index++) {
    tickets.push(generateMissingFieldTicket(ids[index]));
  }

  // Inconsistent tags
  for (let i = 0; i < INCONSISTENT_TAG_COUNT && index < TOTAL_TICKETS; i++, index++) {
    tickets.push(generateInconsistentTagTicket(ids[index]));
  }

  // Clean tickets for the rest
  for (; index < TOTAL_TICKETS; index++) {
    tickets.push(generateCleanTicket(ids[index]));
  }

  // Duplicate IDs: copy some tickets and change a few fields
  for (let i = 0; i < DUPLICATE_ID_COUNT; i++) {
    const sourceIdx = randomInt(0, tickets.length - 1);
    const dupe = { ...tickets[sourceIdx] };
    dupe.title = `${randomItem(TITLE_PREFIXES)} ${randomItem(TITLE_SUBJECTS)}`;
    dupe.updatedAt = randomDate(2024, 2025);
    tickets.push(dupe);
  }

  // Shuffle everything so bad data is mixed in
  for (let i = tickets.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [tickets[i], tickets[j]] = [tickets[j], tickets[i]];
  }

  const outputPath = path.join(__dirname, '..', 'public', 'data', 'tickets.json');
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(tickets, null, 2));

  // Stats
  const stats = {
    total: tickets.length,
    badDates: BAD_DATE_COUNT,
    missingFields: MISSING_FIELD_COUNT,
    inconsistentTags: INCONSISTENT_TAG_COUNT,
    duplicateIds: DUPLICATE_ID_COUNT,
  };

  console.log('Generated tickets:', JSON.stringify(stats, null, 2));
  console.log(`Output: ${outputPath}`);
}

main();
