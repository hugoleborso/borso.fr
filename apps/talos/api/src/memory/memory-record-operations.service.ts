import { randomUUID } from 'node:crypto';
import { TalosError } from '../helpers/errors/talos-error.types';
import { appendJournalSection, appendLineUnderHeading } from './memory-changes.core';
import type { ChangeOperation } from './memory-changes.schema';
import { isCutoverKey } from './memory-cutover.core';
import { forgetStorageMode } from './memory-cutover.service';
import type { OperationContext, OperationOutcome } from './memory-entity-operations.service';
import {
  planDraftStatus,
  planFocusSlots,
  planStatusAttributes,
  planTodoInsert,
  planTodoUpdate,
} from './memory-plans.core';
import {
  findCommitment,
  findDocument,
  findDraft,
  findJournalEntry,
  findLastTodoPosition,
  findProposal,
  findState,
  findTodo,
  type MemoryExecutor,
} from './memory.repository';
import {
  upsertCommitment,
  upsertDocument,
  upsertDraft,
  upsertFocusItem,
  upsertJournalEntry,
  upsertProposal,
  upsertState,
  upsertTodo,
} from './memory-write.repository';

type OperationOf<Name extends ChangeOperation['op']> = Extract<ChangeOperation, { op: Name }>;

const FOLLOW_UP_HEADING = 'Suivi';
const DECISION_HEADING = 'Décision';
const FOCUS_UPDATED_ON_KEY = 'focus.updated_on';
const WEEKLY_JOURNAL_PATTERN = /-S\d{2}-hebdo$/;

function refuseUnknown(what: string, slug: string): never {
  throw new TalosError('memory-not-found', { message: `${what} inconnu : ${slug}` });
}

// @FollowsBlueprint service-orchestration
export async function upsertCommitmentOperation(
  context: OperationContext,
  operation: OperationOf<'commitment.upsert'>,
): Promise<OperationOutcome> {
  const before = await findCommitment(context.executor, operation.slug);
  const after = {
    slug: operation.slug,
    direction: operation.direction ?? null,
    counterpart: operation.counterpart ?? null,
    action: operation.action ?? null,
    due: operation.due ?? null,
    status: operation.status,
    attributes: JSON.stringify(operation.attributes ?? {}),
    body: operation.body ?? before?.body ?? '',
    createdAt: before?.createdAt ?? context.now,
    updatedAt: context.now,
  };
  await upsertCommitment(context.executor, after);
  return { status: before === null ? 'created' : 'updated', before, after };
}

export async function changeCommitmentStatusOperation(
  context: OperationContext,
  operation: OperationOf<'commitment.status'>,
): Promise<OperationOutcome> {
  const before =
    (await findCommitment(context.executor, operation.slug)) ??
    refuseUnknown('engagement', operation.slug);
  const body =
    operation.note === undefined
      ? before.body
      : appendLineUnderHeading(
          before.body,
          FOLLOW_UP_HEADING,
          `- ${context.today} : ${operation.note}`,
        );
  const after = {
    ...before,
    status: operation.status,
    attributes: planStatusAttributes(before.attributes, operation.status),
    body,
    updatedAt: context.now,
  };
  await upsertCommitment(context.executor, after);
  return { status: 'updated', before, after };
}

export async function addTodoOperation(
  context: OperationContext,
  operation: OperationOf<'todo.add'>,
): Promise<OperationOutcome> {
  const lastPosition = await findLastTodoPosition(context.executor, operation.list);
  const after = planTodoInsert(operation, randomUUID(), lastPosition, context.today, context.now);
  const before = await findTodo(context.executor, after.id);
  await upsertTodo(context.executor, after);
  return { id: after.id, status: before === null ? 'created' : 'updated', before, after };
}

async function getTodo(executor: MemoryExecutor, id: string) {
  return (await findTodo(executor, id)) ?? refuseUnknown('todo', id);
}

export async function updateTodoOperation(
  context: OperationContext,
  operation: OperationOf<'todo.update'>,
): Promise<OperationOutcome> {
  const before = await getTodo(context.executor, operation.id);
  const after = planTodoUpdate(before, operation, context.today, context.now);
  await upsertTodo(context.executor, after);
  return { id: operation.id, status: 'updated', before, after };
}

export async function removeTodoOperation(
  context: OperationContext,
  operation: OperationOf<'todo.remove'>,
): Promise<OperationOutcome> {
  const before = await getTodo(context.executor, operation.id);
  const after = { ...before, removed: true, updatedAt: context.now };
  await upsertTodo(context.executor, after);
  return { id: operation.id, status: 'updated', before, after };
}

export async function replaceFocusOperation(
  context: OperationContext,
  operation: OperationOf<'focus.replace'>,
): Promise<OperationOutcome> {
  const slots = planFocusSlots(operation);
  for (const slot of slots) await upsertFocusItem(context.executor, slot);
  await upsertState(context.executor, {
    key: FOCUS_UPDATED_ON_KEY,
    value: JSON.stringify(operation.updatedOn ?? context.today),
    updatedAt: context.now,
  });
  return { status: 'updated', before: null, after: operation.items };
}

export async function upsertProposalOperation(
  context: OperationContext,
  operation: OperationOf<'proposal.upsert'>,
): Promise<OperationOutcome> {
  const before = await findProposal(context.executor, operation.slug);
  const after = {
    slug: operation.slug,
    category: operation.category,
    status: operation.status,
    title: operation.title,
    priority: operation.priority,
    createdOn: operation.createdOn,
    expiresOn: operation.expiresOn ?? null,
    attributes: JSON.stringify(operation.attributes ?? {}),
    body: operation.body,
    updatedAt: context.now,
  };
  await upsertProposal(context.executor, after);
  return { status: before === null ? 'created' : 'updated', before, after };
}

export async function changeProposalStatusOperation(
  context: OperationContext,
  operation: OperationOf<'proposal.status'>,
): Promise<OperationOutcome> {
  const before =
    (await findProposal(context.executor, operation.slug)) ??
    refuseUnknown('proposition', operation.slug);
  const body =
    operation.decisionLine === undefined
      ? before.body
      : appendLineUnderHeading(before.body, DECISION_HEADING, operation.decisionLine);
  const after = {
    ...before,
    status: operation.status,
    attributes: planStatusAttributes(before.attributes, operation.status),
    body,
    updatedAt: context.now,
  };
  await upsertProposal(context.executor, after);
  return { status: 'updated', before, after };
}

export async function upsertDraftOperation(
  context: OperationContext,
  operation: OperationOf<'draft.upsert'>,
): Promise<OperationOutcome> {
  const before = await findDraft(context.executor, operation.slug);
  const after = {
    slug: operation.slug,
    channel: operation.channel,
    recipients: operation.recipients,
    subject: operation.subject ?? null,
    link: operation.link ?? null,
    status: operation.status,
    createdOn: operation.createdOn,
    sentOn: operation.sentOn ?? null,
    sourceRef: operation.sourceRef ?? null,
    proposalSlug: operation.proposalSlug ?? null,
    attributes: JSON.stringify(operation.attributes ?? {}),
    body: operation.body,
    updatedAt: context.now,
  };
  await upsertDraft(context.executor, after);
  return { status: before === null ? 'created' : 'updated', before, after };
}

export async function changeDraftStatusOperation(
  context: OperationContext,
  operation: OperationOf<'draft.status'>,
): Promise<OperationOutcome> {
  const before =
    (await findDraft(context.executor, operation.slug)) ??
    refuseUnknown('brouillon', operation.slug);
  const after = {
    ...before,
    ...planDraftStatus(before, operation.status, operation.sentOn),
    status: operation.status,
    updatedAt: context.now,
  };
  await upsertDraft(context.executor, after);
  return { status: 'updated', before, after };
}

export async function appendJournalOperation(
  context: OperationContext,
  operation: OperationOf<'journal.append'>,
): Promise<OperationOutcome> {
  const before = await findJournalEntry(context.executor, operation.slug);
  const after = {
    slug: operation.slug,
    kind: before?.kind ?? 'daily',
    content: appendJournalSection(
      before?.content ?? null,
      operation.slug,
      operation.heading,
      operation.markdown,
    ),
    updatedAt: context.now,
  };
  await upsertJournalEntry(context.executor, after);
  return { status: before === null ? 'created' : 'updated', before, after };
}

export async function writeJournalOperation(
  context: OperationContext,
  operation: OperationOf<'journal.write'>,
): Promise<OperationOutcome> {
  const before = await findJournalEntry(context.executor, operation.slug);
  const inferredKind = WEEKLY_JOURNAL_PATTERN.test(operation.slug) ? 'weekly' : 'daily';
  const after = {
    slug: operation.slug,
    kind: operation.kind ?? inferredKind,
    content: operation.content,
    updatedAt: context.now,
  };
  await upsertJournalEntry(context.executor, after);
  return { status: before === null ? 'created' : 'updated', before, after };
}

export async function writeDocumentOperation(
  context: OperationContext,
  operation: OperationOf<'document.write'>,
): Promise<OperationOutcome> {
  const before = await findDocument(context.executor, operation.slug);
  const after = {
    slug: operation.slug,
    content: operation.content,
    contentType: operation.contentType ?? before?.contentType ?? 'markdown',
    updatedAt: context.now,
  };
  await upsertDocument(context.executor, after);
  return { status: before === null ? 'created' : 'updated', before, after };
}

export async function setStateOperation(
  context: OperationContext,
  operation: OperationOf<'state.set'>,
): Promise<OperationOutcome> {
  const before = await findState(context.executor, operation.key);
  const after = {
    key: operation.key,
    value: JSON.stringify(operation.value),
    updatedAt: context.now,
  };
  await upsertState(context.executor, after);
  const isCutoverChange = isCutoverKey(operation.key);
  if (isCutoverChange) forgetStorageMode();
  return { status: before === null ? 'created' : 'updated', before, after };
}
