import { MOST_READS_IN_FLIGHT, READ_BATCH_PATH } from '@domain/read-batch.core';
import {
  isRefusedBatch,
  keepCallers,
  mergeIdenticalReads,
  readIdentity,
  pairAnswersWithReads,
  rememberFailedCallers,
  takeFailedCaller,
  readContentType,
  takeNextBatch,
  toBatchedRead,
  toCallerResponse,
  toReadBatchInit,
  toLoneReadInit,
  toLoneRead,
  toAbortError,
  type FailedCallers,
  type MergedRead,
  type WaitingRead,
} from './read-batch.core';

type FetchResponse = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface ReadBatchFailure {
  readonly status: number | null;
  readonly size: number;
}

export interface ReadTransportOptions {
  readonly apiBase: string;
  readonly closeGroup?: (close: () => void) => void;
  readonly closeRetryGroup?: (close: () => void) => void;
  readonly fetchResponse?: FetchResponse;
  readonly reportBatchFailure: (failure: ReadBatchFailure) => void;
}

export interface ReadTransport {
  readonly send: FetchResponse;
  readonly reset: () => void;
}

interface Caller {
  readonly signal: AbortSignal | null | undefined;
  readonly resolve: (response: Response) => void;
  readonly reject: (reason: unknown) => void;
}

const MALFORMED_BATCH_ANSWER = 'read-batch-malformed';

function fetchFromPlatform(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return globalThis.fetch(input, init);
}

function isStillWaiting(caller: Caller): boolean {
  return caller.signal?.aborted !== true;
}

function closeAfterWaitingTimers(close: () => void): void {
  setTimeout(close);
}

function callersOf(batch: readonly MergedRead<Caller>[]): Caller[] {
  return batch.flatMap((entry) => entry.callers);
}

// @FollowsBlueprint adapter-direct-upload
export function createReadTransport(options: ReadTransportOptions): ReadTransport {
  const {
    apiBase,
    closeGroup = queueMicrotask,
    closeRetryGroup = closeAfterWaitingTimers,
    fetchResponse = fetchFromPlatform,
    reportBatchFailure,
  } = options;
  let openGroup: WaitingRead<Caller>[] = [];
  let retryGroup: WaitingRead<Caller>[] = [];
  let failedCallers: FailedCallers = new Map();
  let waiting: MergedRead<Caller>[] = [];
  let readsInFlight = 0;
  let lane: object = {};

  async function sendAlone(entry: MergedRead<Caller>): Promise<void> {
    try {
      const response = await fetchResponse(
        `${apiBase}${entry.read.path}`,
        toLoneReadInit(entry.read),
      );
      const answer = {
        status: response.status,
        contentType: readContentType(response),
        body: await response.text(),
      };
      entry.callers.forEach((caller) => caller.resolve(toCallerResponse(answer)));
    } catch (error) {
      entry.callers.forEach((caller) => caller.reject(error));
    }
  }

  function rememberFailedBatch(batch: readonly MergedRead<Caller>[]): void {
    failedCallers = rememberFailedCallers(failedCallers, batch);
  }

  async function sendBatch(batch: readonly MergedRead<Caller>[]): Promise<void> {
    const size = batch.length;
    try {
      const response = await fetchResponse(
        `${apiBase}${READ_BATCH_PATH}`,
        toReadBatchInit(batch.map((entry) => entry.read)),
      );
      const isRefused = isRefusedBatch(response.status);
      if (isRefused) {
        reportBatchFailure({ status: response.status, size });
        rememberFailedBatch(batch);
        const failure = {
          status: response.status,
          contentType: readContentType(response),
          body: await response.text(),
        };
        callersOf(batch).forEach((caller) => caller.resolve(toCallerResponse(failure)));
        return;
      }
      const pairs = pairAnswersWithReads(batch, await response.json());
      if (pairs === null) throw new Error(MALFORMED_BATCH_ANSWER);
      pairs.forEach(([entry, answer]) =>
        entry.callers.forEach((caller) => caller.resolve(toCallerResponse(answer))),
      );
    } catch (error) {
      reportBatchFailure({ status: null, size });
      rememberFailedBatch(batch);
      callersOf(batch).forEach((caller) => caller.reject(error));
    }
  }

  function leave(batch: readonly MergedRead<Caller>[]): void {
    const startedIn = lane;
    const loneRead = toLoneRead(batch);
    readsInFlight += 1;
    const leaving = loneRead === null ? sendBatch(batch) : sendAlone(loneRead);
    void leaving.then(() => {
      if (startedIn !== lane) return;
      readsInFlight -= 1;
      drain();
    });
  }

  function drain(): void {
    waiting = keepCallers(waiting, isStillWaiting);
    if (readsInFlight >= MOST_READS_IN_FLIGHT || waiting.length === 0) return;
    const { batch, rest } = takeNextBatch(waiting);
    waiting = rest;
    leave(batch);
    drain();
  }

  function closeOpenGroup(): void {
    waiting = mergeIdenticalReads(waiting, openGroup);
    openGroup = [];
    drain();
  }

  function closeOpenRetryGroup(): void {
    waiting = mergeIdenticalReads(waiting, retryGroup);
    retryGroup = [];
    drain();
  }

  function joinGroup(entry: WaitingRead<Caller>): void {
    const { isRetry, failed } = takeFailedCaller(failedCallers, readIdentity(entry.read));
    failedCallers = failed;
    if (isRetry) {
      if (retryGroup.length === 0) closeRetryGroup(closeOpenRetryGroup);
      retryGroup.push(entry);
      return;
    }
    if (openGroup.length === 0) closeGroup(closeOpenGroup);
    openGroup.push(entry);
  }

  function send(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (typeof input !== 'string') return fetchResponse(input, init);
    const read = toBatchedRead(input, init, apiBase);
    if (read === null) return fetchResponse(input, init);
    const signal = init?.signal;
    if (signal?.aborted === true) return Promise.reject(toAbortError(signal.reason));
    const listening = new AbortController();
    const stopListening = () => listening.abort();
    const answer = new Promise<Response>((resolve, reject) => {
      signal?.addEventListener('abort', () => reject(toAbortError(signal.reason)), {
        signal: listening.signal,
      });
      joinGroup({ read, caller: { signal, resolve, reject } });
    });
    void answer.then(stopListening, stopListening);
    return answer;
  }

  function reset(): void {
    openGroup = [];
    retryGroup = [];
    failedCallers = new Map();
    waiting = [];
    readsInFlight = 0;
    lane = {};
  }

  return { send, reset };
}
