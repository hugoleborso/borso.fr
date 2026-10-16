import { TalosError } from '../helpers/errors/talos-error.types';
import type { ChangeOperation } from './memory-changes.schema';
import {
  isSourceConflicting,
  planEntityUpsert,
  planFactInsert,
  planRelationInsert,
} from './memory-plans.core';
import { closeRaw } from './page-rendering.core';
import { isMissingMemoryTarget, normalizeAliasValue } from './memory-text.core';
import {
  findEntity,
  findFact,
  findRelation,
  findSource,
  findVerb,
  type MemoryExecutor,
} from './memory.repository';
import {
  countPagesWithSlug,
  findLastFactPosition,
  findLastRelationPosition,
} from './memory-positions.repository';
import {
  didInsertAlias,
  didInsertCitation,
  insertFact,
  insertRelation,
  didInsertSource,
  moveSlugEverywhere,
  updateEntity,
  updateFact,
  updateRelation,
  upsertEntity,
  upsertVerb,
} from './memory-write.repository';

import type { OperationStatus } from './memory-changes-response.core';

export interface OperationOutcome {
  readonly id?: string;
  readonly status: OperationStatus;
  readonly before: unknown;
  readonly after: unknown;
}

export interface OperationContext {
  readonly executor: MemoryExecutor;
  readonly now: Date;
  readonly today: string;
}

type OperationOf<Name extends ChangeOperation['op']> = Extract<ChangeOperation, { op: Name }>;

async function getEntity(executor: MemoryExecutor, slug: string) {
  const entity = await findEntity(executor, slug);
  if (entity === null)
    throw new TalosError('memory-not-found', { message: `page inconnue : ${slug}` });
  return entity;
}

// @FollowsBlueprint service-orchestration
export async function upsertEntityOperation(
  context: OperationContext,
  operation: OperationOf<'entity.upsert'>,
): Promise<OperationOutcome> {
  const existing = await findEntity(context.executor, operation.slug);
  const plan = planEntityUpsert(existing, operation, context.now);
  if (plan.kind === 'version-conflict') {
    throw new TalosError('memory-conflict', {
      message: `version attendue périmée : ${operation.slug}`,
    });
  }
  await upsertEntity(context.executor, plan.values);
  return { status: plan.status, before: existing, after: plan.values };
}

export async function archiveEntityOperation(
  context: OperationContext,
  operation: OperationOf<'entity.archive'>,
): Promise<OperationOutcome> {
  const before = await getEntity(context.executor, operation.slug);
  await updateEntity(context.executor, operation.slug, { archived: true, updatedAt: context.now });
  return { status: 'updated', before, after: { ...before, archived: true } };
}

export async function renameEntityOperation(
  context: OperationContext,
  operation: OperationOf<'entity.rename'>,
): Promise<OperationOutcome> {
  const before = await getEntity(context.executor, operation.from);
  if ((await countPagesWithSlug(context.executor, operation.to)) > 0) {
    throw new TalosError('memory-conflict', { message: `slug déjà pris : ${operation.to}` });
  }
  await moveSlugEverywhere(context.executor, operation.from, operation.to);
  return { status: 'updated', before, after: { ...before, slug: operation.to } };
}

export async function addAliasOperation(
  context: OperationContext,
  operation: OperationOf<'alias.add'>,
): Promise<OperationOutcome> {
  await getEntity(context.executor, operation.slug);
  const alias = {
    entitySlug: operation.slug,
    kind: operation.kind,
    normalizedValue: normalizeAliasValue(operation.value),
    value: operation.value,
  };
  const isCreated = await didInsertAlias(context.executor, alias);
  return { status: isCreated ? 'created' : 'unchanged', before: null, after: alias };
}

export async function addFactOperation(
  context: OperationContext,
  operation: OperationOf<'fact.add'>,
): Promise<OperationOutcome> {
  await getEntity(context.executor, operation.slug);
  const section = operation.section ?? 'facts';
  const lastPosition = await findLastFactPosition(context.executor, operation.slug, section);
  const values = planFactInsert(operation, lastPosition, context.today, context.now);
  const id = await insertFact(context.executor, values);
  return { id, status: 'created', before: null, after: { ...values, id } };
}

async function getFact(executor: MemoryExecutor, id: string) {
  const fact = await findFact(executor, id);
  if (fact === null) throw new TalosError('memory-not-found', { message: `fait inconnu : ${id}` });
  return fact;
}

async function getRelation(executor: MemoryExecutor, id: string) {
  const relation = await findRelation(executor, id);
  if (relation === null) {
    throw new TalosError('memory-not-found', { message: `relation inconnue : ${id}` });
  }
  return relation;
}

export async function closeFactOperation(
  context: OperationContext,
  operation: OperationOf<'fact.close'>,
): Promise<OperationOutcome> {
  const before = await getFact(context.executor, operation.id);
  const changes = {
    until: operation.until,
    section: 'history',
    raw: before.raw === null ? null : closeRaw(before.raw, operation.until, operation.note ?? null),
  };
  await updateFact(context.executor, operation.id, changes);
  return { id: operation.id, status: 'updated', before, after: { ...before, ...changes } };
}

export async function confirmFactOperation(
  context: OperationContext,
  operation: OperationOf<'fact.confirm'>,
): Promise<OperationOutcome> {
  const before = await getFact(context.executor, operation.id);
  const changes = { seen: operation.seen, sourceRef: operation.sourceRef ?? before.sourceRef };
  await updateFact(context.executor, operation.id, changes);
  return { id: operation.id, status: 'updated', before, after: { ...before, ...changes } };
}

async function assertPageExists(executor: MemoryExecutor, slug: string): Promise<void> {
  if ((await countPagesWithSlug(executor, slug)) === 0) {
    throw new TalosError('memory-not-found', { message: `page inconnue : ${slug}` });
  }
}

export async function addRelationOperation(
  context: OperationContext,
  operation: OperationOf<'relation.add'>,
): Promise<OperationOutcome> {
  if ((await findVerb(context.executor, operation.verb)) === null) {
    throw new TalosError('memory-refused', { message: `verbe inconnu : ${operation.verb}` });
  }
  await assertPageExists(context.executor, operation.from);
  const targetPageCount = await countPagesWithSlug(context.executor, operation.to);
  const isTargetMissing = isMissingMemoryTarget(operation.to, targetPageCount);
  if (isTargetMissing) {
    throw new TalosError('memory-not-found', { message: `page inconnue : ${operation.to}` });
  }
  const lastPosition = await findLastRelationPosition(context.executor, operation.from);
  const values = planRelationInsert(operation, lastPosition, context.today, context.now);
  const id = await insertRelation(context.executor, values);
  return { id, status: 'created', before: null, after: { ...values, id } };
}

export async function closeRelationOperation(
  context: OperationContext,
  operation: OperationOf<'relation.close'>,
): Promise<OperationOutcome> {
  const before = await getRelation(context.executor, operation.id);
  const changes = {
    until: operation.until,
    raw: before.raw === null ? null : closeRaw(before.raw, operation.until, operation.note ?? null),
  };
  await updateRelation(context.executor, operation.id, changes);
  return { id: operation.id, status: 'updated', before, after: { ...before, ...changes } };
}

export async function confirmRelationOperation(
  context: OperationContext,
  operation: OperationOf<'relation.confirm'>,
): Promise<OperationOutcome> {
  const before = await getRelation(context.executor, operation.id);
  const changes = { seen: operation.seen, sourceRef: operation.sourceRef ?? before.sourceRef };
  await updateRelation(context.executor, operation.id, changes);
  return { id: operation.id, status: 'updated', before, after: { ...before, ...changes } };
}

export async function addVerbOperation(
  context: OperationContext,
  operation: OperationOf<'verb.add'>,
): Promise<OperationOutcome> {
  const before = await findVerb(context.executor, operation.name);
  const after = {
    name: operation.name,
    description: operation.description,
    linkLength: operation.linkLength,
  };
  await upsertVerb(context.executor, after);
  return { status: before === null ? 'created' : 'updated', before, after };
}

export async function addSourceOperation(
  context: OperationContext,
  operation: OperationOf<'source.add'>,
): Promise<OperationOutcome> {
  const existing = await findSource(context.executor, operation.slug);
  const isConflicting = isSourceConflicting(existing, operation.content);
  if (isConflicting) {
    throw new TalosError('memory-conflict', { message: `source déjà écrite : ${operation.slug}` });
  }
  const values = {
    slug: operation.slug,
    origin: operation.origin ?? null,
    occurredOn: operation.occurredOn ?? null,
    title: operation.title ?? null,
    confidentiality: operation.confidentiality ?? null,
    metadata: JSON.stringify(operation.metadata ?? {}),
    content: operation.content,
    createdAt: context.now,
  };
  const isCreated = await didInsertSource(context.executor, values);
  const summary = { ...values, content: `${String(operation.content.length)} caractères` };
  return { status: isCreated ? 'created' : 'unchanged', before: null, after: summary };
}

export async function addCitationOperation(
  context: OperationContext,
  operation: OperationOf<'citation.add'>,
): Promise<OperationOutcome> {
  const citation = { entitySlug: operation.slug, sourceRef: operation.sourceRef };
  const isCreated = await didInsertCitation(context.executor, {
    ...citation,
    createdAt: context.now,
  });
  return { status: isCreated ? 'created' : 'unchanged', before: null, after: citation };
}
