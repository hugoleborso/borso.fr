/** @Feature takes */

import type {
  QueuedTakeEntry,
  TakeQueueStorage,
  TakeQueueWriteOutcome,
} from './take-queue.adapter';
import {
  buildTakeCreateBody,
  decideNextTakeMove,
  isTakeDrainable,
  type QueuedTake,
  selectNextTakeStep,
  type SignedTakeUpload,
  type TakeCreateBody,
  type TakeStep,
  type TakeStepFailure,
  type TakeStepOutcome,
  withRetryRequested,
  withSignedUpload,
  withUploadedAudio,
} from './take-queue.core';

export type TakeTransportResult<TValue> =
  | { readonly kind: 'ok'; readonly value: TValue }
  | { readonly kind: 'failed'; readonly status: number | null };

export interface TakeQueueTransport<TCreated> {
  readonly sign: (take: QueuedTake) => Promise<TakeTransportResult<SignedTakeUpload>>;
  readonly put: (uploadUrl: string, audio: File) => Promise<TakeTransportResult<true>>;
  readonly create: (body: TakeCreateBody) => Promise<TakeTransportResult<TCreated>>;
}

export interface TakeQueueSettings<TCreated> {
  readonly storage: TakeQueueStorage;
  readonly transport: TakeQueueTransport<TCreated>;
  readonly onCreated: (created: TCreated) => void;
  readonly onExhausted: (failure: TakeStepFailure, take: QueuedTake) => void;
  readonly onRetry: (failure: TakeStepFailure) => void;
  readonly wait: (milliseconds: number) => Promise<void>;
  readonly now: () => number;
  readonly isOnline: () => boolean;
}

export interface TakeQueue {
  readonly subscribe: (listener: () => void) => () => void;
  readonly read: () => readonly QueuedTakeEntry[];
  readonly readOnServer: () => readonly QueuedTakeEntry[];
  readonly load: () => Promise<void>;
  readonly enqueue: (entry: QueuedTakeEntry) => Promise<TakeQueueWriteOutcome>;
  readonly drain: () => Promise<void>;
  readonly retry: (takeId: string) => Promise<void>;
}

type StepRunner<TCreated> = (take: QueuedTake, audio: File) => Promise<TakeStepOutcome<TCreated>>;

const NOTHING_QUEUED: readonly QueuedTakeEntry[] = [];

function toAudioFile(entry: QueuedTakeEntry): File {
  return new File([entry.audio], entry.take.id, { type: entry.take.contentType });
}

function failedAt(stage: TakeStep, status: number | null): TakeStepOutcome<never> {
  return { kind: 'failed', failure: { stage, status } };
}

function buildStepRunners<TCreated>(
  transport: TakeQueueTransport<TCreated>,
): Record<TakeStep, StepRunner<TCreated>> {
  return {
    sign: async (take) => {
      const signed = await transport.sign(take);
      if (signed.kind === 'failed') return failedAt('sign', signed.status);
      return { kind: 'advanced', take: withSignedUpload(take, signed.value) };
    },
    put: async (take, audio) => {
      const sent = await transport.put(take.upload?.uploadUrl ?? '', audio);
      if (sent.kind === 'failed') return failedAt('put', sent.status);
      return { kind: 'advanced', take: withUploadedAudio(take) };
    },
    create: async (take) => {
      const body = buildTakeCreateBody(take, take.upload?.objectKey ?? '');
      const created = await transport.create(body);
      if (created.kind === 'failed') return failedAt('create', created.status);
      return { kind: 'created', created: created.value };
    },
  };
}

// @FollowsBlueprint external-store-module
export function createTakeQueue<TCreated>(settings: TakeQueueSettings<TCreated>): TakeQueue {
  const listeners = new Set<() => void>();
  const stepRunners = buildStepRunners(settings.transport);
  let queuedEntries: readonly QueuedTakeEntry[] = NOTHING_QUEUED;
  let draining: Promise<void> | null = null;

  const publish = (next: readonly QueuedTakeEntry[]): void => {
    queuedEntries = next;
    for (const listener of listeners) listener();
  };

  const replace = (take: QueuedTake): QueuedTakeEntry | null => {
    const current = queuedEntries.find((entry) => entry.take.id === take.id);
    if (current === undefined) return null;
    const updated = { take, audio: current.audio };
    publish(queuedEntries.map((entry) => (entry.take.id === take.id ? updated : entry)));
    return updated;
  };

  const persist = async (take: QueuedTake): Promise<void> => {
    const updated = replace(take);
    if (updated !== null) await settings.storage.save(updated);
  };

  const forget = async (takeId: string): Promise<void> => {
    publish(queuedEntries.filter((entry) => entry.take.id !== takeId));
    await settings.storage.remove(takeId).catch(() => undefined);
  };

  const finishCreated = async (takeId: string, created: TCreated): Promise<void> => {
    await forget(takeId);
    settings.onCreated(created);
  };

  const stopSending = async (take: QueuedTake, failure: TakeStepFailure): Promise<void> => {
    settings.onExhausted(failure, take);
    await persist(take);
  };

  const waitBeforeRetry = async (failure: TakeStepFailure, milliseconds: number): Promise<void> => {
    settings.onRetry(failure);
    await settings.wait(milliseconds);
  };

  const send = async (entry: QueuedTakeEntry): Promise<void> => {
    const audio = toAudioFile(entry);
    let take = entry.take;
    let attempt = 0;
    for (;;) {
      const runStep = stepRunners[selectNextTakeStep(take, settings.now())];
      const move = decideNextTakeMove(await runStep(take, audio), take, attempt);
      if (move.kind === 'done') return finishCreated(take.id, move.created);
      if (move.kind === 'stop') return stopSending(move.take, move.failure);
      take = move.take;
      attempt = move.attempt;
      if (move.isPersisted) await persist(take);
      if (move.retriedAfter !== null)
        await waitBeforeRetry(move.retriedAfter, move.waitMilliseconds);
    }
  };

  const drainOnce = async (): Promise<void> => {
    const attempted = new Set<string>();
    for (;;) {
      if (!settings.isOnline()) return;
      const next = queuedEntries.find(
        (entry) => isTakeDrainable(entry.take) && !attempted.has(entry.take.id),
      );
      if (next === undefined) return;
      attempted.add(next.take.id);
      await send(next);
    }
  };

  const drain = (): Promise<void> => {
    draining ??= drainOnce().finally(() => {
      draining = null;
    });
    return draining;
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    read: () => queuedEntries,
    readOnServer: () => NOTHING_QUEUED,
    load: async () => {
      const stored = await settings.storage.list();
      const known = new Set(queuedEntries.map((entry) => entry.take.id));
      publish([...queuedEntries, ...stored.filter((entry) => !known.has(entry.take.id))]);
    },
    enqueue: async (entry) => {
      const outcome = await settings.storage.save(entry);
      if (outcome.kind !== 'queued') return outcome;
      publish([...queuedEntries, entry]);
      void drain();
      return outcome;
    },
    drain,
    retry: async (takeId) => {
      const current = queuedEntries.find((entry) => entry.take.id === takeId);
      if (current === undefined) return;
      await persist(withRetryRequested(current.take));
      await drain();
    },
  };
}
