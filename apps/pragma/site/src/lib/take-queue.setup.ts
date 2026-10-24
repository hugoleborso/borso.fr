/** @Feature takes */

import {
  recordTakeBreadcrumb,
  reportTakeQueueWriteFailed,
  reportTakeUploadFailed,
} from '../observability/error-reporting.adapter';
import { sendFileToPresignedUrl } from './object-upload.adapter';
import {
  createTakeRecord,
  type ListedTake,
  signTakeUpload,
  writeCreatedTake,
} from './queries/takes.queries';
import { queryClient } from './query-client.setup';
import { readBrowserTakeQueueStorage } from './take-queue.adapter';
import { buildQueuedTake, type QueueTakeOutcome, type TakeDraft } from './take-queue.core';
import { createTakeQueue, type TakeTransportResult } from './take-queue.store';

const ONLINE_EVENT = 'online';
const SURFACE = 'take-queue';

async function putTakeAudio(uploadUrl: string, audio: File): Promise<TakeTransportResult<true>> {
  const outcome = await sendFileToPresignedUrl(uploadUrl, audio);
  if (outcome.kind === 'sent') return { kind: 'ok', value: true };
  return { kind: 'failed', status: outcome.kind === 'refused' ? outcome.status : null };
}

function waitFor(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export const takeQueue = createTakeQueue<ListedTake>({
  storage: readBrowserTakeQueueStorage(),
  transport: { sign: signTakeUpload, put: putTakeAudio, create: createTakeRecord },
  onCreated: (take) => writeCreatedTake(queryClient, take),
  onExhausted: (failure) => reportTakeUploadFailed(failure),
  onRetry: () => recordTakeBreadcrumb('take_upload_retried'),
  wait: waitFor,
  now: () => Date.now(),
  isOnline: () => navigator.onLine,
});

function drainTakeQueue(): void {
  void takeQueue.drain();
}

export function startTakeQueue(): void {
  takeQueue
    .load()
    .then(drainTakeQueue)
    .catch((error: unknown) => console.warn({ surface: SURFACE, error }));
  window.addEventListener(ONLINE_EVENT, drainTakeQueue);
}

export type TakeRecordingDetails = Omit<TakeDraft, 'id' | 'byteLength' | 'isOnline'>;

export async function queueTake(
  details: TakeRecordingDetails,
  audio: Blob,
): Promise<QueueTakeOutcome> {
  const take = buildQueuedTake({
    ...details,
    id: crypto.randomUUID(),
    byteLength: audio.size,
    isOnline: navigator.onLine,
  });
  if (typeof take === 'string') return take;
  const outcome = await takeQueue.enqueue({ take, audio });
  if ('error' in outcome) reportTakeQueueWriteFailed(outcome.error);
  return outcome.kind;
}
