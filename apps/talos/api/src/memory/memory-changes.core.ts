import { z } from 'zod';
import type { ChangeOperation } from './memory-changes.schema';
import type { AttributeMap } from './page-rendering.core';
import { measureBytes } from './memory-text.core';

export const MAXIMUM_ROWS_PER_TRANSACTION = 2500;
const MEBIBYTE = 1_048_576;
const MAXIMUM_MEBIBYTES_PER_TRANSACTION = 8;
export const MAXIMUM_BYTES_PER_TRANSACTION = MAXIMUM_MEBIBYTES_PER_TRANSACTION * MEBIBYTE;
export const MAXIMUM_CONFLICT_ATTEMPTS = 3;
const SERIALIZATION_FAILURE_CODE = '40001';
const ROWS_PER_SIMPLE_OPERATION = 2;
const ROWS_PER_FOCUS_REPLACEMENT = 4;
const ROWS_PER_RENAME = 500;
const BYTES_PER_COPY_OF_A_ROW = 3;
const LINE_BREAK = '\n';

export interface OperationChunk {
  readonly from: number;
  readonly to: number;
}

export interface OperationSubject {
  readonly objectType: string;
  readonly objectId: string;
}

const attributesTextSchema = z.record(z.string(), z.union([z.string(), z.array(z.string())]));
const conflictSchema = z.object({ code: z.literal(SERIALIZATION_FAILURE_CODE) });

export function estimateWrittenRows(operation: ChangeOperation): number {
  if (operation.op === 'entity.rename') return ROWS_PER_RENAME;
  if (operation.op === 'focus.replace') return ROWS_PER_FOCUS_REPLACEMENT;
  return ROWS_PER_SIMPLE_OPERATION;
}

export function chunkOperations(operations: readonly ChangeOperation[]): OperationChunk[] {
  const chunks: OperationChunk[] = [];
  let start = 0;
  let rows = 0;
  let bytes = 0;
  operations.forEach((operation, index) => {
    const operationRows = estimateWrittenRows(operation);
    const operationBytes = measureBytes(JSON.stringify(operation)) * BYTES_PER_COPY_OF_A_ROW;
    const isOverflowing =
      rows + operationRows > MAXIMUM_ROWS_PER_TRANSACTION ||
      bytes + operationBytes > MAXIMUM_BYTES_PER_TRANSACTION;
    if (index > start && isOverflowing) {
      chunks.push({ from: start, to: index - 1 });
      start = index;
      rows = 0;
      bytes = 0;
    }
    rows += operationRows;
    bytes += operationBytes;
  });
  if (operations.length > 0) chunks.push({ from: start, to: operations.length - 1 });
  return chunks;
}

export function isRetryableConflict(failure: unknown): boolean {
  return conflictSchema.safeParse(failure).success;
}

export function selectOperationSubject(operation: ChangeOperation): OperationSubject {
  switch (operation.op) {
    case 'entity.upsert':
    case 'entity.archive':
    case 'alias.add':
    case 'citation.add':
      return { objectType: 'entity', objectId: operation.slug };
    case 'entity.rename':
      return { objectType: 'entity', objectId: operation.to };
    case 'fact.add':
      return { objectType: 'fact', objectId: operation.slug };
    case 'fact.close':
    case 'fact.confirm':
      return { objectType: 'fact', objectId: operation.id };
    case 'relation.add':
      return { objectType: 'relation', objectId: operation.from };
    case 'relation.close':
    case 'relation.confirm':
      return { objectType: 'relation', objectId: operation.id };
    case 'verb.add':
      return { objectType: 'verb', objectId: operation.name };
    case 'source.add':
      return { objectType: 'source', objectId: operation.slug };
    case 'commitment.upsert':
    case 'commitment.status':
      return { objectType: 'commitment', objectId: operation.slug };
    case 'todo.add':
      return { objectType: 'todo', objectId: operation.id ?? operation.list };
    case 'todo.update':
    case 'todo.remove':
      return { objectType: 'todo', objectId: operation.id };
    case 'focus.replace':
      return { objectType: 'focus', objectId: 'focus' };
    case 'proposal.upsert':
    case 'proposal.status':
      return { objectType: 'proposal', objectId: operation.slug };
    case 'draft.upsert':
    case 'draft.status':
      return { objectType: 'draft', objectId: operation.slug };
    case 'journal.append':
    case 'journal.write':
      return { objectType: 'journal', objectId: operation.slug };
    case 'document.write':
      return { objectType: 'document', objectId: operation.slug };
    case 'state.set':
      return { objectType: 'state', objectId: operation.key };
  }
}

export function composeEventSummary(
  operation: ChangeOperation,
  objectId: string,
  callSummary: string | undefined,
  index: number,
): string {
  if (index === 0 && callSummary !== undefined && callSummary !== '') return callSummary;
  return `${operation.op} ${objectId}`;
}

export function appendJournalSection(
  content: string | null,
  slug: string,
  heading: string,
  markdown: string,
): string {
  const existing = content ?? `# ${slug.slice(slug.lastIndexOf('/') + 1)}${LINE_BREAK}`;
  return `${existing}\n## ${heading}\n\n${markdown}\n`;
}

export function appendLineUnderHeading(body: string, heading: string, line: string): string {
  const lines = body.split(LINE_BREAK);
  const headingIndex = lines.findIndex((candidate) => candidate.trimEnd() === `## ${heading}`);
  if (headingIndex === -1) {
    const separator = body === '' || body.endsWith(LINE_BREAK) ? '' : LINE_BREAK;
    return `${body}${separator}\n## ${heading}\n\n${line}\n`;
  }
  const nextHeadingOffset = lines
    .slice(headingIndex + 1)
    .findIndex((candidate) => candidate.startsWith('## ') || candidate.startsWith('# '));
  const sectionEnd = nextHeadingOffset === -1 ? lines.length : headingIndex + 1 + nextHeadingOffset;
  let insertionIndex = sectionEnd;
  while (insertionIndex > headingIndex + 1 && lines[insertionIndex - 1]?.trim() === '') {
    insertionIndex -= 1;
  }
  return [...lines.slice(0, insertionIndex), line, ...lines.slice(insertionIndex)].join(LINE_BREAK);
}

export function decodeAttributes(text: string): AttributeMap {
  const stored: unknown = JSON.parse(text);
  return attributesTextSchema.parse(stored);
}

export function decodeJsonText(text: string | null): unknown {
  if (text === null) return null;
  const stored: unknown = JSON.parse(text);
  return stored;
}

const JSON_COLUMNS_BY_TABLE: Readonly<Record<string, readonly string[]>> = {
  memory_entity: ['attributes'],
  memory_source: ['metadata'],
  memory_commitment: ['attributes'],
  memory_todo: ['extra'],
  memory_proposal: ['attributes'],
  memory_draft: ['attributes'],
  memory_state: ['value'],
  memory_event: ['before', 'after'],
  memory_change_batch: ['result'],
};

const storedRowSchema = z.record(z.string(), z.unknown());

export function decodeJsonColumns(tableName: string, row: unknown): Record<string, unknown> {
  const jsonColumns = JSON_COLUMNS_BY_TABLE[tableName] ?? [];
  const columns = storedRowSchema.parse(row);
  return Object.fromEntries(
    Object.entries(columns).map(([column, value]) => [
      column,
      jsonColumns.includes(column) && typeof value === 'string' ? decodeJsonText(value) : value,
    ]),
  );
}
