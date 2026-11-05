import { MOST_READS_IN_FLIGHT, READ_BATCH_PATH } from '@domain/read-batch.core';
import {
  isRefusedBatch,
  keepCallers,
  mergeIdenticalReads,
  pairAnswersWithReads,
  readContentType,
  takeNextBatch,
  toBatchedRead,
  toCallerResponse,
  toReadBatchInit,
  toLoneReadInit,
  toLoneRead,
  toAbortError,
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

function callersOf(batch: readonly MergedRead<Caller>[]): Caller[] {
  return batch.flatMap((entry) => entry.callers);
}

// @FollowsBlueprint adapter-direct-upload
export function createReadTransport(options: ReadTransportOptions): ReadTransport {
  const {
    apiBase,
    closeGroup = queueMicrotask,
    fetchResponse = fetchFromPlatform,
    reportBatchFailure,
  } = options;
  let openGroup: WaitingRead<Caller>[] = [];
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

  function send(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (typeof input !== 'string') return fetchResponse(input, init);
    const read = toBatchedRead(input, init, apiBase);
    if (read === null) return fetchResponse(input, init);
    const signal = init?.signal;
    if (signal?.aborted === true) return Promise.reject(toAbortError(signal.reason));
    return new Promise<Response>((resolve, reject) => {
      signal?.addEventListener('abort', () => reject(toAbortError(signal.reason)));
      if (openGroup.length === 0) closeGroup(closeOpenGroup);
      openGroup.push({ read, caller: { signal, resolve, reject } });
    });
  }

  function reset(): void {
    openGroup = [];
    waiting = [];
    readsInFlight = 0;
    lane = {};
  }

  return { send, reset };
}
