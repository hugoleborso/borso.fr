import { boolean, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull();
const updatedAt = () => timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull();

// @FollowsBlueprint schema-dsql-constraints
export const memoryCommitmentTable = pgTable('memory_commitment', {
  slug: text('slug').primaryKey(),
  direction: text('direction'),
  counterpart: text('counterpart'),
  action: text('action'),
  due: text('due'),
  status: text('status').notNull(),
  attributes: text('attributes').notNull(),
  body: text('body').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const memoryTodoTable = pgTable(
  'memory_todo',
  {
    id: text('id').primaryKey(),
    list: text('list').notNull(),
    position: integer('position').notNull(),
    text: text('text').notNull(),
    done: boolean('done').notNull().default(false),
    dueDate: text('due_date'),
    commitmentSlug: text('commitment_slug'),
    sourceRef: text('source_ref'),
    addedOn: text('added_on'),
    doneOn: text('done_on'),
    extra: text('extra').notNull(),
    removed: boolean('removed').notNull().default(false),
    updatedAt: updatedAt(),
  },
  (table) => [index('memory_todo_list_idx').on(table.list)],
);

export const memoryFocusItemTable = pgTable('memory_focus_item', {
  rank: integer('rank').primaryKey(),
  title: text('title').notNull(),
  why: text('why'),
  horizon: text('horizon'),
});

export const memoryProposalTable = pgTable('memory_proposal', {
  slug: text('slug').primaryKey(),
  category: text('category').notNull(),
  status: text('status').notNull(),
  title: text('title').notNull(),
  priority: text('priority').notNull(),
  createdOn: text('created_on').notNull(),
  expiresOn: text('expires_on'),
  attributes: text('attributes').notNull(),
  body: text('body').notNull(),
  updatedAt: updatedAt(),
});

export const memoryDraftTable = pgTable('memory_draft', {
  slug: text('slug').primaryKey(),
  channel: text('channel').notNull(),
  recipients: text('recipients').notNull(),
  subject: text('subject'),
  link: text('link'),
  status: text('status').notNull(),
  createdOn: text('created_on').notNull(),
  sentOn: text('sent_on'),
  sourceRef: text('source_ref'),
  proposalSlug: text('proposal_slug'),
  attributes: text('attributes').notNull(),
  body: text('body').notNull(),
  updatedAt: updatedAt(),
});

export const memoryJournalEntryTable = pgTable('memory_journal_entry', {
  slug: text('slug').primaryKey(),
  kind: text('kind').notNull(),
  content: text('content').notNull(),
  updatedAt: updatedAt(),
});

export const memoryDocumentTable = pgTable('memory_document', {
  slug: text('slug').primaryKey(),
  content: text('content').notNull(),
  contentType: text('content_type').notNull(),
  updatedAt: updatedAt(),
});

export const memoryStateTable = pgTable('memory_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: updatedAt(),
});

export const memoryEventTable = pgTable(
  'memory_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull(),
    actor: text('actor').notNull(),
    tokenName: text('token_name'),
    runId: text('run_id'),
    operation: text('operation').notNull(),
    objectType: text('object_type').notNull(),
    objectId: text('object_id').notNull(),
    before: text('before'),
    after: text('after'),
    summary: text('summary').notNull(),
  },
  (table) => [index('memory_event_occurred_at_idx').on(table.occurredAt)],
);

export const memoryChangeBatchTable = pgTable('memory_change_batch', {
  idempotencyKey: text('idempotency_key').primaryKey(),
  runId: text('run_id'),
  actor: text('actor').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true, mode: 'date' }).notNull(),
  result: text('result').notNull(),
});
