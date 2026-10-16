import { formatParisDate } from '../helpers/calendar/paris-clock.utils';
import { TalosError } from '../helpers/errors/talos-error.types';
import {
  chunkOperations,
  composeEventSummary,
  isRetryableConflict,
  MAXIMUM_CONFLICT_ATTEMPTS,
  type OperationChunk,
  selectOperationSubject,
} from './memory-changes.core';
import {
  type ChangeOperation,
  changeOperationSchema,
  type ChangeRequest,
} from './memory-changes.schema';
import {
  addAliasOperation,
  addCitationOperation,
  addFactOperation,
  addRelationOperation,
  addSourceOperation,
  addVerbOperation,
  archiveEntityOperation,
  closeFactOperation,
  closeRelationOperation,
  confirmFactOperation,
  confirmRelationOperation,
  type OperationContext,
  type OperationOutcome,
  renameEntityOperation,
  upsertEntityOperation,
} from './memory-entity-operations.service';
import {
  type ChangeResponse,
  composeChangeResponse,
  type OperationResult,
  readStoredResponse,
} from './memory-changes-response.core';
import { hasSecret } from './memory-guards.core';
import {
  addTodoOperation,
  appendJournalOperation,
  changeCommitmentStatusOperation,
  changeDraftStatusOperation,
  changeProposalStatusOperation,
  removeTodoOperation,
  replaceFocusOperation,
  setStateOperation,
  updateTodoOperation,
  upsertCommitmentOperation,
  upsertDraftOperation,
  upsertProposalOperation,
  writeDocumentOperation,
  writeJournalOperation,
} from './memory-record-operations.service';
import { findChangeBatch, type MemoryExecutor } from './memory.repository';
import { insertChangeBatch, insertEvent, runInMemoryTransaction } from './memory-write.repository';

type OperationName = ChangeOperation['op'];
type OperationOf<Name extends OperationName> = Extract<ChangeOperation, { op: Name }>;
type OperationHandler<Name extends OperationName> = (
  context: OperationContext,
  operation: OperationOf<Name>,
) => Promise<OperationOutcome>;

const OPERATION_HANDLERS: { readonly [Name in OperationName]: OperationHandler<Name> } = {
  'entity.upsert': upsertEntityOperation,
  'entity.archive': archiveEntityOperation,
  'entity.rename': renameEntityOperation,
  'alias.add': addAliasOperation,
  'fact.add': addFactOperation,
  'fact.close': closeFactOperation,
  'fact.confirm': confirmFactOperation,
  'relation.add': addRelationOperation,
  'relation.close': closeRelationOperation,
  'relation.confirm': confirmRelationOperation,
  'verb.add': addVerbOperation,
  'source.add': addSourceOperation,
  'citation.add': addCitationOperation,
  'commitment.upsert': upsertCommitmentOperation,
  'commitment.status': changeCommitmentStatusOperation,
  'todo.add': addTodoOperation,
  'todo.update': updateTodoOperation,
  'todo.remove': removeTodoOperation,
  'focus.replace': replaceFocusOperation,
  'proposal.upsert': upsertProposalOperation,
  'proposal.status': changeProposalStatusOperation,
  'draft.upsert': upsertDraftOperation,
  'draft.status': changeDraftStatusOperation,
  'journal.append': appendJournalOperation,
  'journal.write': writeJournalOperation,
  'document.write': writeDocumentOperation,
  'state.set': setStateOperation,
};

export interface ChangeCaller {
  readonly tokenName: string | null;
  readonly now: Date;
}

async function applyOperation<Name extends OperationName>(
  context: OperationContext,
  operation: OperationOf<Name>,
): Promise<OperationOutcome> {
  const handler: OperationHandler<Name> = OPERATION_HANDLERS[operation.op];
  return await handler(context, operation);
}

function validateOperations(request: ChangeRequest): ChangeOperation[] {
  if (hasSecret([request.summary, request.actor, request.runId])) {
    throw new TalosError('memory-refused', {
      message: 'secret détecté : rien n’a été écrit',
      extra: { operationIndex: null, issues: [] },
    });
  }
  return request.operations.map((candidate, operationIndex) => {
    const operation = changeOperationSchema.safeParse(candidate);
    if (!operation.success) {
      throw new TalosError('memory-refused', {
        message: 'opération invalide',
        extra: { operationIndex, issues: operation.error.issues },
      });
    }
    if (hasSecret(operation.data)) {
      throw new TalosError('memory-refused', {
        message: 'secret détecté : rien n’a été écrit',
        extra: { operationIndex, issues: [] },
      });
    }
    return operation.data;
  });
}

async function applyChunk(
  executor: MemoryExecutor,
  request: ChangeRequest,
  operations: readonly ChangeOperation[],
  chunk: OperationChunk,
  caller: ChangeCaller,
): Promise<OperationResult[]> {
  const context = { executor, now: caller.now, today: formatParisDate(caller.now) };
  const appliedResults: OperationResult[] = [];
  for (let index = chunk.from; index <= chunk.to; index += 1) {
    const operation = operations[index];
    if (operation === undefined) continue;
    const outcome = await applyOperation(context, operation);
    const subject = selectOperationSubject(operation);
    await insertEvent(executor, {
      occurredAt: caller.now,
      actor: request.actor,
      tokenName: caller.tokenName,
      runId: request.runId ?? null,
      operation: operation.op,
      objectType: subject.objectType,
      objectId: outcome.id ?? subject.objectId,
      before: outcome.before === null ? null : JSON.stringify(outcome.before),
      after: outcome.after === null ? null : JSON.stringify(outcome.after),
      summary: composeEventSummary(operation, subject.objectId, request.summary, index),
    });
    appliedResults.push({
      index,
      op: operation.op,
      ...(outcome.id === undefined ? {} : { id: outcome.id }),
      status: outcome.status,
    });
  }
  return appliedResults;
}

async function applyChunkWithRetry(
  work: () => Promise<OperationResult[]>,
  attempt = 1,
): Promise<OperationResult[]> {
  try {
    return await work();
  } catch (error) {
    if (attempt >= MAXIMUM_CONFLICT_ATTEMPTS || !isRetryableConflict(error)) throw error;
    return await applyChunkWithRetry(work, attempt + 1);
  }
}

async function recordBatch(
  executor: MemoryExecutor,
  request: ChangeRequest,
  caller: ChangeCaller,
  response: ChangeResponse,
): Promise<void> {
  await insertChangeBatch(executor, {
    idempotencyKey: request.idempotencyKey,
    runId: request.runId ?? null,
    actor: request.actor,
    appliedAt: caller.now,
    result: JSON.stringify(response),
  });
}

// @FollowsBlueprint service-orchestration
export async function applyChanges(
  request: ChangeRequest,
  caller: ChangeCaller,
): Promise<ChangeResponse> {
  const stored = await findChangeBatch(request.idempotencyKey);
  if (stored !== null) return readStoredResponse(stored.result);
  const operations = validateOperations(request);
  const chunks = chunkOperations(operations);
  const appliedResults: OperationResult[] = [];
  const committed = chunks.map(() => false);
  for (const [chunkIndex, chunk] of chunks.entries()) {
    const isLastChunk = chunkIndex === chunks.length - 1;
    try {
      const applied = await applyChunkWithRetry(() =>
        runInMemoryTransaction(async (executor) => {
          const chunkResults = await applyChunk(executor, request, operations, chunk, caller);
          const finalCommitted = chunks.map(() => true);
          const response = composeChangeResponse(
            [...appliedResults, ...chunkResults],
            chunks,
            finalCommitted,
            null,
          );
          if (isLastChunk) await recordBatch(executor, request, caller, response);
          return chunkResults;
        }),
      );
      appliedResults.push(...applied);
      committed[chunkIndex] = true;
    } catch (error) {
      if (chunkIndex === 0) throw error;
      const partial = composeChangeResponse(appliedResults, chunks, committed, error);
      await runInMemoryTransaction(async (executor) => {
        await recordBatch(executor, request, caller, partial);
      });
      return partial;
    }
  }
  return composeChangeResponse(appliedResults, chunks, committed, null);
}
