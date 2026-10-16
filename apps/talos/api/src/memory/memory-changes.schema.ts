import { z } from 'zod';

export const MAXIMUM_OPERATIONS_PER_CALL = 500;
const MAXIMUM_IDEMPOTENCY_KEY_LENGTH = 200;
const MAXIMUM_SLUG_LENGTH = 500;
const MAXIMUM_TEXT_BYTES = 1_048_576;
const MAXIMUM_FOCUS_ITEMS = 3;
const LOWEST_CLOSENESS = 1;
const HIGHEST_CLOSENESS = 5;

const slugSchema = z.string().min(1).max(MAXIMUM_SLUG_LENGTH);
const longTextSchema = z.string().max(MAXIMUM_TEXT_BYTES);
const shortTextSchema = z.string().max(MAXIMUM_SLUG_LENGTH);
const dateTextSchema = z.string().min(1).max(MAXIMUM_SLUG_LENGTH);
const attributeValueSchema = z.union([z.string(), z.array(z.string())]);
export const attributesSchema = z.record(z.string(), attributeValueSchema);

export const ENTITY_KINDS = [
  'personne',
  'organisation',
  'projet',
  'domaine',
  'concept',
  'reunion',
  'carte',
  'moi',
  'objectif',
  'autre',
] as const;
export const ALIAS_KINDS = ['name', 'alias', 'email', 'handle'] as const;
export const FACT_SECTIONS = ['facts', 'history'] as const;
export const LINK_LENGTHS = ['short', 'medium', 'long'] as const;
export const TODO_LIST_NAMES = ['personal', 'work'] as const;
export const COMMITMENT_STATUSES = ['ouvert', 'fait', 'annule', 'abandonne'] as const;
export const JOURNAL_KINDS = ['daily', 'weekly', 'other'] as const;
export const CONTENT_TYPES = ['markdown', 'json', 'text'] as const;

const datedLineFields = {
  since: dateTextSchema.optional(),
  until: dateTextSchema.optional(),
  seen: dateTextSchema.optional(),
  sourceRef: shortTextSchema.optional(),
  inferred: z.boolean().optional(),
  raw: longTextSchema.optional(),
  learnedOn: dateTextSchema.optional(),
  position: z.number().int().min(0).optional(),
};

const closingFields = { id: z.uuid(), until: dateTextSchema, note: shortTextSchema.optional() };
const confirmingFields = {
  id: z.uuid(),
  seen: dateTextSchema,
  sourceRef: shortTextSchema.optional(),
};

export const changeOperationSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('entity.upsert'),
    slug: slugSchema,
    kind: z.enum(ENTITY_KINDS),
    title: shortTextSchema.min(1),
    summary: longTextSchema.optional(),
    body: longTextSchema.optional(),
    attributes: attributesSchema.optional(),
    closeness: z.number().int().min(LOWEST_CLOSENESS).max(HIGHEST_CLOSENESS).optional(),
    closenessReason: shortTextSchema.optional(),
    confidentiality: shortTextSchema.optional(),
    expectedVersion: z.number().int().min(1).optional(),
  }),
  z.object({ op: z.literal('entity.archive'), slug: slugSchema }),
  z.object({ op: z.literal('entity.rename'), from: slugSchema, to: slugSchema }),
  z.object({
    op: z.literal('alias.add'),
    slug: slugSchema,
    kind: z.enum(ALIAS_KINDS),
    value: shortTextSchema.min(1),
  }),
  z.object({
    op: z.literal('fact.add'),
    slug: slugSchema,
    section: z.enum(FACT_SECTIONS).optional(),
    key: shortTextSchema.optional(),
    value: longTextSchema,
    ...datedLineFields,
  }),
  z.object({ op: z.literal('fact.close'), ...closingFields }),
  z.object({ op: z.literal('fact.confirm'), ...confirmingFields }),
  z.object({
    op: z.literal('relation.add'),
    from: slugSchema,
    verb: shortTextSchema.min(1),
    to: slugSchema,
    ...datedLineFields,
  }),
  z.object({ op: z.literal('relation.close'), ...closingFields }),
  z.object({ op: z.literal('relation.confirm'), ...confirmingFields }),
  z.object({
    op: z.literal('verb.add'),
    name: shortTextSchema.min(1),
    description: shortTextSchema,
    linkLength: z.enum(LINK_LENGTHS),
  }),
  z.object({
    op: z.literal('source.add'),
    slug: slugSchema,
    content: longTextSchema,
    origin: shortTextSchema.optional(),
    occurredOn: dateTextSchema.optional(),
    title: shortTextSchema.optional(),
    confidentiality: shortTextSchema.optional(),
    metadata: attributesSchema.optional(),
  }),
  z.object({ op: z.literal('citation.add'), slug: slugSchema, sourceRef: shortTextSchema.min(1) }),
  z.object({
    op: z.literal('commitment.upsert'),
    slug: slugSchema,
    direction: z.enum(['moi->eux', 'eux->moi']).optional(),
    counterpart: shortTextSchema.optional(),
    action: shortTextSchema.optional(),
    due: dateTextSchema.optional(),
    status: z.enum(COMMITMENT_STATUSES),
    attributes: attributesSchema.optional(),
    body: longTextSchema.optional(),
  }),
  z.object({
    op: z.literal('commitment.status'),
    slug: slugSchema,
    status: z.enum(COMMITMENT_STATUSES),
    note: shortTextSchema.optional(),
  }),
  z.object({
    op: z.literal('todo.add'),
    list: z.enum(TODO_LIST_NAMES),
    text: shortTextSchema.min(1),
    dueDate: dateTextSchema.optional(),
    commitmentSlug: slugSchema.optional(),
    sourceRef: shortTextSchema.optional(),
    addedOn: dateTextSchema.optional(),
    id: shortTextSchema.min(1).optional(),
    position: z.number().int().min(0).optional(),
    done: z.boolean().optional(),
    doneOn: dateTextSchema.optional(),
    extra: z.array(z.tuple([z.string(), z.string()])).optional(),
  }),
  z.object({
    op: z.literal('todo.update'),
    id: shortTextSchema.min(1),
    text: shortTextSchema.min(1).optional(),
    done: z.boolean().optional(),
    dueDate: dateTextSchema.nullable().optional(),
    doneOn: dateTextSchema.optional(),
  }),
  z.object({ op: z.literal('todo.remove'), id: shortTextSchema.min(1) }),
  z.object({
    op: z.literal('focus.replace'),
    items: z
      .array(
        z.object({
          title: shortTextSchema.min(1),
          why: shortTextSchema.optional(),
          horizon: shortTextSchema.optional(),
        }),
      )
      .max(MAXIMUM_FOCUS_ITEMS),
    updatedOn: dateTextSchema.optional(),
  }),
  z.object({
    op: z.literal('proposal.upsert'),
    slug: slugSchema,
    category: shortTextSchema.min(1),
    status: shortTextSchema.min(1),
    title: shortTextSchema.min(1),
    priority: shortTextSchema.min(1),
    createdOn: dateTextSchema,
    expiresOn: dateTextSchema.optional(),
    attributes: attributesSchema.optional(),
    body: longTextSchema,
  }),
  z.object({
    op: z.literal('proposal.status'),
    slug: slugSchema,
    status: shortTextSchema.min(1),
    decisionLine: shortTextSchema.optional(),
  }),
  z.object({
    op: z.literal('draft.upsert'),
    slug: slugSchema,
    channel: shortTextSchema.min(1),
    recipients: shortTextSchema,
    subject: shortTextSchema.optional(),
    link: shortTextSchema.optional(),
    status: shortTextSchema.min(1),
    createdOn: dateTextSchema,
    sentOn: dateTextSchema.optional(),
    sourceRef: shortTextSchema.optional(),
    proposalSlug: slugSchema.optional(),
    attributes: attributesSchema.optional(),
    body: longTextSchema,
  }),
  z.object({
    op: z.literal('draft.status'),
    slug: slugSchema,
    status: shortTextSchema.min(1),
    sentOn: dateTextSchema.optional(),
  }),
  z.object({
    op: z.literal('journal.append'),
    slug: slugSchema,
    heading: shortTextSchema.min(1),
    markdown: longTextSchema,
  }),
  z.object({
    op: z.literal('journal.write'),
    slug: slugSchema,
    content: longTextSchema,
    kind: z.enum(JOURNAL_KINDS).optional(),
  }),
  z.object({
    op: z.literal('document.write'),
    slug: slugSchema,
    content: longTextSchema,
    contentType: z.enum(CONTENT_TYPES).optional(),
  }),
  z.object({ op: z.literal('state.set'), key: shortTextSchema.min(1), value: z.json() }),
]);

export const changeRequestSchema = z.object({
  idempotencyKey: z.string().min(1).max(MAXIMUM_IDEMPOTENCY_KEY_LENGTH),
  actor: shortTextSchema.min(1),
  runId: shortTextSchema.optional(),
  summary: longTextSchema.optional(),
  operations: z.array(z.unknown()).min(1).max(MAXIMUM_OPERATIONS_PER_CALL),
});

export type ChangeOperation = z.infer<typeof changeOperationSchema>;
export type ChangeRequest = z.infer<typeof changeRequestSchema>;
