import {
  isBatchableRead,
  MOST_READS_PER_BATCH,
  type BatchedAnswer,
  type BatchedRead,
} from '@domain/read-batch.core';
import {
  PRAGMA_REQUEST_HEADER_NAMES,
  type PragmaRequestHeader,
} from '@domain/request-headers.core';

const READ_METHOD = 'GET';
const API_PATH_PREFIX = '/api/';
const CONTENT_TYPE_HEADER = 'content-type';
const JSON_CONTENT_TYPE = 'application/json';
const FIRST_ANSWERABLE_STATUS = 200;
const LAST_ANSWERABLE_STATUS = 599;
const NO_CONTENT_STATUS = 204;
const RESET_CONTENT_STATUS = 205;
const NOT_MODIFIED_STATUS = 304;
const NULL_BODY_STATUSES: ReadonlySet<number> = new Set([
  NO_CONTENT_STATUS,
  RESET_CONTENT_STATUS,
  NOT_MODIFIED_STATUS,
]);
const ANSWERED_BATCH_STATUS = 200;
const TOO_MANY_REQUESTS_STATUS = 429;
const FIRST_SERVER_ERROR_STATUS = 500;
const ABORT_ERROR_NAME = 'AbortError';
const KEY_SEPARATOR = '\n';

export interface WaitingRead<Caller> {
  readonly read: BatchedRead;
  readonly caller: Caller;
}

export interface MergedRead<Caller> {
  readonly read: BatchedRead;
  readonly callers: readonly Caller[];
}

function isPragmaRequestHeader(name: string): name is PragmaRequestHeader {
  return PRAGMA_REQUEST_HEADER_NAMES.some((allowed) => allowed === name);
}

// @FollowsBlueprint core-decision
export function toBatchedRead(
  url: string,
  init: RequestInit | undefined,
  apiBase: string,
): BatchedRead | null {
  const method = init?.method ?? READ_METHOD;
  if (method.toUpperCase() !== READ_METHOD) return null;
  if (!url.startsWith(`${apiBase}${API_PATH_PREFIX}`)) return null;
  const path = url.slice(apiBase.length);
  if (!isBatchableRead(path)) return null;
  const headers = [...new Headers(init?.headers)];
  if (!headers.every(([name]) => isPragmaRequestHeader(name))) return null;
  return { path, headers: Object.fromEntries(headers) };
}

function compareHeaderNames(
  left: readonly [string, string],
  right: readonly [string, string],
): number {
  return left[0].localeCompare(right[0]);
}

export function readIdentity(read: BatchedRead): string {
  const headers = Object.entries(read.headers).sort(compareHeaderNames);
  return [read.path, JSON.stringify(headers)].join(KEY_SEPARATOR);
}

export function mergeIdenticalReads<Caller>(
  merged: readonly MergedRead<Caller>[],
  arriving: readonly WaitingRead<Caller>[],
): MergedRead<Caller>[] {
  const byIdentity = new Map<string, MergedRead<Caller>>(
    merged.map((entry) => [readIdentity(entry.read), entry]),
  );
  arriving.forEach(({ read, caller }) => {
    const identity = readIdentity(read);
    const known = byIdentity.get(identity);
    byIdentity.set(identity, {
      read: known?.read ?? read,
      callers: [...(known?.callers ?? []), caller],
    });
  });
  return [...byIdentity.values()];
}

export interface RetriedCaller {
  readonly hasRetried: boolean;
}

export function splitForRetry<Caller extends RetriedCaller>(
  entry: MergedRead<Caller>,
  isRetryable: boolean,
): { readonly retries: WaitingRead<Caller>[]; readonly settling: Caller[] } {
  if (!isRetryable) return { retries: [], settling: [...entry.callers] };
  return {
    retries: entry.callers
      .filter((caller) => !caller.hasRetried)
      .map((caller) => ({ read: entry.read, caller: { ...caller, hasRetried: true } })),
    settling: entry.callers.filter((caller) => caller.hasRetried),
  };
}

export function keepCallers<Caller>(
  merged: readonly MergedRead<Caller>[],
  isKept: (caller: Caller) => boolean,
): MergedRead<Caller>[] {
  return merged
    .map((entry) => ({ read: entry.read, callers: entry.callers.filter(isKept) }))
    .filter((entry) => entry.callers.length > 0);
}

export function takeNextBatch<Item>(
  items: readonly Item[],
  batchSize: number = MOST_READS_PER_BATCH,
): { readonly batch: Item[]; readonly rest: Item[] } {
  return { batch: items.slice(0, batchSize), rest: items.slice(batchSize) };
}

export function toLoneRead<Item>(batch: readonly Item[]): Item | null {
  const [only, ...others] = batch;
  return only !== undefined && others.length === 0 ? only : null;
}

export function toLoneReadInit(read: BatchedRead): RequestInit {
  return { credentials: 'include', headers: { ...read.headers } };
}

export function toReadBatchInit(reads: readonly BatchedRead[]): RequestInit {
  return {
    method: 'POST',
    credentials: 'include',
    headers: { [CONTENT_TYPE_HEADER]: JSON_CONTENT_TYPE },
    body: JSON.stringify({ reads }),
  };
}

function isAnswerableStatus(status: unknown): boolean {
  return (
    Number.isInteger(status) &&
    Number(status) >= FIRST_ANSWERABLE_STATUS &&
    Number(status) <= LAST_ANSWERABLE_STATUS
  );
}

function isBatchedAnswer(value: unknown): value is BatchedAnswer {
  if (typeof value !== 'object' || value === null) return false;
  const contentType: unknown = Reflect.get(value, 'contentType');
  return (
    isAnswerableStatus(Reflect.get(value, 'status')) &&
    (contentType === null || typeof contentType === 'string') &&
    typeof Reflect.get(value, 'body') === 'string'
  );
}

function readAnswers(value: unknown): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, 'answers') : null;
}

function hasAnswer<Item>(pair: readonly [Item, unknown]): pair is readonly [Item, BatchedAnswer] {
  return isBatchedAnswer(pair[1]);
}

export function pairAnswersWithReads<Item>(
  items: readonly Item[],
  batchAnswer: unknown,
): (readonly [Item, BatchedAnswer])[] | null {
  const answers = readAnswers(batchAnswer);
  if (!Array.isArray(answers) || answers.length !== items.length) return null;
  const answerList: readonly unknown[] = answers;
  const pairs = items.map((item, index) => [item, answerList[index]] as const);
  return pairs.every(hasAnswer) ? pairs : null;
}

export function toCallerResponse(answer: BatchedAnswer): Response {
  const body = NULL_BODY_STATUSES.has(answer.status) ? null : answer.body;
  const headers: Record<string, string> =
    answer.contentType === null ? {} : { [CONTENT_TYPE_HEADER]: answer.contentType };
  return new Response(body, { status: answer.status, headers });
}

export function readContentType(response: Response): string | null {
  return response.headers.get(CONTENT_TYPE_HEADER);
}

export function isRefusedBatch(status: number): boolean {
  return status !== ANSWERED_BATCH_STATUS;
}

export function isRetryableStatus(status: number): boolean {
  return status === TOO_MANY_REQUESTS_STATUS || status >= FIRST_SERVER_ERROR_STATUS;
}

export function toAbortError(reason: unknown): Error {
  return reason instanceof Error ? reason : new DOMException(String(reason), ABORT_ERROR_NAME);
}
