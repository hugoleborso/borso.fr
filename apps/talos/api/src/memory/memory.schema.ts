import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull();
const updatedAt = () => timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull();

// @FollowsBlueprint schema-dsql-constraints
export const memoryEntityTable = pgTable('memory_entity', {
  slug: text('slug').primaryKey(),
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  summary: text('summary'),
  body: text('body').notNull(),
  attributes: text('attributes').notNull(),
  closeness: integer('closeness'),
  closenessReason: text('closeness_reason'),
  confidentiality: text('confidentiality'),
  archived: boolean('archived').notNull().default(false),
  version: integer('version').notNull().default(1),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const memoryAliasTable = pgTable(
  'memory_alias',
  {
    entitySlug: text('entity_slug').notNull(),
    kind: text('kind').notNull(),
    normalizedValue: text('normalized_value').notNull(),
    value: text('value').notNull(),
  },
  (table) => [
    primaryKey({
      name: 'memory_alias_pk',
      columns: [table.entitySlug, table.kind, table.normalizedValue],
    }),
    index('memory_alias_normalized_value_idx').on(table.normalizedValue),
  ],
);

const datedLineColumns = () => ({
  position: integer('position').notNull(),
  since: text('since'),
  until: text('until'),
  seen: text('seen'),
  sourceRef: text('source_ref'),
  inferred: boolean('inferred').notNull().default(false),
  extra: text('extra'),
  raw: text('raw'),
  learnedOn: text('learned_on'),
  createdAt: createdAt(),
});

export const memoryFactTable = pgTable(
  'memory_fact',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entitySlug: text('entity_slug').notNull(),
    section: text('section').notNull(),
    key: text('key'),
    value: text('value').notNull(),
    ...datedLineColumns(),
  },
  (table) => [index('memory_fact_entity_slug_idx').on(table.entitySlug)],
);

export const memoryRelationTable = pgTable(
  'memory_relation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromSlug: text('from_slug').notNull(),
    verb: text('verb').notNull(),
    toSlug: text('to_slug').notNull(),
    ...datedLineColumns(),
  },
  (table) => [
    index('memory_relation_from_slug_idx').on(table.fromSlug),
    index('memory_relation_to_slug_idx').on(table.toSlug),
  ],
);

export const memoryVerbTable = pgTable('memory_verb', {
  name: text('name').primaryKey(),
  description: text('description').notNull(),
  linkLength: text('link_length').notNull(),
});

export const memorySourceTable = pgTable('memory_source', {
  slug: text('slug').primaryKey(),
  origin: text('origin'),
  occurredOn: text('occurred_on'),
  title: text('title'),
  confidentiality: text('confidentiality'),
  metadata: text('metadata').notNull(),
  content: text('content').notNull(),
  createdAt: createdAt(),
});

export const memoryCitationTable = pgTable(
  'memory_citation',
  {
    entitySlug: text('entity_slug').notNull(),
    sourceRef: text('source_ref').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ name: 'memory_citation_pk', columns: [table.entitySlug, table.sourceRef] }),
    index('memory_citation_source_ref_idx').on(table.sourceRef),
  ],
);

export type MemoryEntityRow = typeof memoryEntityTable.$inferSelect;
export type MemoryAliasRow = typeof memoryAliasTable.$inferSelect;
export type MemoryFactRow = typeof memoryFactTable.$inferSelect;
export type MemoryRelationRow = typeof memoryRelationTable.$inferSelect;
export type MemoryVerbRow = typeof memoryVerbTable.$inferSelect;
export type MemorySourceRow = typeof memorySourceTable.$inferSelect;
export type MemoryCitationRow = typeof memoryCitationTable.$inferSelect;
