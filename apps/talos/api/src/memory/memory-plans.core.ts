import { decodeAttributes } from './memory-changes.core';
import type { ChangeOperation } from './memory-changes.schema';
import type { memoryTodoTable } from './memory-records.schema';
import type { memoryEntityTable, memoryFactTable, memoryRelationTable } from './memory.schema';

type OperationOf<Name extends ChangeOperation['op']> = Extract<ChangeOperation, { op: Name }>;
type EntityRow = typeof memoryEntityTable.$inferSelect;
type EntityInsert = typeof memoryEntityTable.$inferInsert;
type TodoRow = typeof memoryTodoTable.$inferSelect;

export type EntityUpsertPlan =
  | {
      readonly kind: 'write';
      readonly status: 'created' | 'updated';
      readonly values: EntityInsert;
    }
  | { readonly kind: 'version-conflict' };

const FOCUS_SLOT_COUNT = 3;
const FOCUS_RANKS = Array.from({ length: FOCUS_SLOT_COUNT }, (_unused, index) => index + 1);
const FIRST_VERSION = 1;

function isVersionStale(expectedVersion: number | undefined, currentVersion: number): boolean {
  return expectedVersion !== undefined && expectedVersion !== currentVersion;
}

// @FollowsBlueprint core-decision
export function planEntityUpsert(
  existing: EntityRow | null,
  operation: OperationOf<'entity.upsert'>,
  now: Date,
): EntityUpsertPlan {
  const currentVersion = existing?.version ?? FIRST_VERSION;
  if (isVersionStale(operation.expectedVersion, currentVersion)) {
    return { kind: 'version-conflict' };
  }
  return {
    kind: 'write',
    status: existing === null ? 'created' : 'updated',
    values: {
      slug: operation.slug,
      kind: operation.kind,
      title: operation.title,
      summary: operation.summary ?? existing?.summary ?? null,
      body: operation.body ?? existing?.body ?? '',
      attributes:
        operation.attributes === undefined
          ? (existing?.attributes ?? JSON.stringify({ type: operation.kind }))
          : JSON.stringify(operation.attributes),
      closeness: operation.closeness ?? existing?.closeness ?? null,
      closenessReason: operation.closenessReason ?? existing?.closenessReason ?? null,
      confidentiality: operation.confidentiality ?? existing?.confidentiality ?? null,
      archived: existing?.archived ?? false,
      version: existing === null ? FIRST_VERSION : existing.version + 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
  };
}

export function isSourceConflicting(
  existing: { readonly content: string } | null,
  content: string,
): boolean {
  return existing !== null && existing.content !== content;
}

function selectNextPosition(requested: number | undefined, lastPosition: number | null): number {
  return requested ?? (lastPosition === null ? 0 : lastPosition + 1);
}

function buildDatedLine(
  operation: OperationOf<'fact.add'> | OperationOf<'relation.add'>,
  lastPosition: number | null,
  today: string,
  now: Date,
) {
  return {
    position: selectNextPosition(operation.position, lastPosition),
    since: operation.since ?? null,
    until: operation.until ?? null,
    seen: operation.seen ?? null,
    sourceRef: operation.sourceRef ?? null,
    inferred: operation.inferred ?? false,
    extra: operation.extra ?? null,
    raw: operation.raw ?? null,
    learnedOn: operation.learnedOn ?? today,
    createdAt: now,
  };
}

export function planFactInsert(
  operation: OperationOf<'fact.add'>,
  lastPosition: number | null,
  today: string,
  now: Date,
): typeof memoryFactTable.$inferInsert {
  return {
    entitySlug: operation.slug,
    section: operation.section ?? 'facts',
    key: operation.key ?? null,
    value: operation.value,
    ...buildDatedLine(operation, lastPosition, today, now),
  };
}

export function planRelationInsert(
  operation: OperationOf<'relation.add'>,
  lastPosition: number | null,
  today: string,
  now: Date,
): typeof memoryRelationTable.$inferInsert {
  return {
    fromSlug: operation.from,
    verb: operation.verb,
    toSlug: operation.to,
    ...buildDatedLine(operation, lastPosition, today, now),
  };
}

export function planTodoInsert(
  operation: OperationOf<'todo.add'>,
  generatedId: string,
  lastPosition: number | null,
  today: string,
  now: Date,
): typeof memoryTodoTable.$inferInsert {
  const isDone = operation.done ?? false;
  return {
    id: operation.id ?? generatedId,
    list: operation.list,
    position: selectNextPosition(operation.position, lastPosition),
    text: operation.text,
    done: isDone,
    dueDate: operation.dueDate ?? null,
    commitmentSlug: operation.commitmentSlug ?? null,
    sourceRef: operation.sourceRef ?? null,
    addedOn: operation.addedOn ?? today,
    doneOn: operation.doneOn ?? (isDone ? today : null),
    extra: JSON.stringify(operation.extra ?? []),
    removed: false,
    updatedAt: now,
  };
}

export function planTodoUpdate(
  existing: TodoRow,
  operation: OperationOf<'todo.update'>,
  today: string,
  now: Date,
): TodoRow {
  const isDone = operation.done ?? existing.done;
  const doneOn = isDone ? (operation.doneOn ?? existing.doneOn ?? today) : null;
  return {
    ...existing,
    text: operation.text ?? existing.text,
    done: isDone,
    dueDate: operation.dueDate === undefined ? existing.dueDate : operation.dueDate,
    doneOn,
    updatedAt: now,
  };
}

export interface FocusSlot {
  readonly rank: number;
  readonly title: string;
  readonly why: string | null;
  readonly horizon: string | null;
}

export function planFocusSlots(operation: OperationOf<'focus.replace'>): FocusSlot[] {
  return FOCUS_RANKS.map((rank) => {
    const focusItem = operation.items[rank - 1];
    return {
      rank,
      title: focusItem?.title ?? '',
      why: focusItem?.why ?? null,
      horizon: focusItem?.horizon ?? null,
    };
  });
}

const STATUS_ATTRIBUTE = 'statut';
const SENT_ON_ATTRIBUTE = 'envoye';
const SENT_DRAFT_STATUS = 'envoye';

export function planStatusAttributes(attributesText: string, status: string): string {
  return JSON.stringify({ ...decodeAttributes(attributesText), [STATUS_ATTRIBUTE]: status });
}

export interface DraftStatusPlan {
  readonly sentOn: string | null;
  readonly attributes: string;
}

export function planDraftStatus(
  existing: { readonly sentOn: string | null; readonly attributes: string },
  status: string,
  requestedSentOn: string | undefined,
): DraftStatusPlan {
  const sentOn = status === SENT_DRAFT_STATUS ? (requestedSentOn ?? existing.sentOn) : null;
  const attributes = decodeAttributes(existing.attributes);
  const hasSentOnAttribute = SENT_ON_ATTRIBUTE in attributes || sentOn !== null;
  return {
    sentOn,
    attributes: JSON.stringify({
      ...attributes,
      [STATUS_ATTRIBUTE]: status,
      ...(hasSentOnAttribute ? { [SENT_ON_ATTRIBUTE]: sentOn ?? '' } : {}),
    }),
  };
}
