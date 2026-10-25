/** @Feature takes */

import { type TakeFileCandidate, validateTakeFile } from '@domain/take-upload.core';
import { z } from 'zod';
import type { QueueTakeOutcome, TakeNotSavedReason } from '../../lib/take-queue.core';

export interface PracticeCandidate {
  readonly id: string;
  readonly kind: string;
  readonly date: string;
}

const PRACTICE_KIND = 'practice';
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const MILLISECONDS_PER_MINUTE = 60_000;
const NEAREST_PRACTICE_WINDOW_MILLISECONDS =
  HOURS_PER_DAY * MINUTES_PER_HOUR * MILLISECONDS_PER_MINUTE;

function distanceFrom(recordedAt: Date, session: PracticeCandidate): number {
  return Math.abs(Date.parse(session.date) - recordedAt.getTime());
}

// @FollowsBlueprint core-decision
export function selectNearestPractice(
  sessions: readonly PracticeCandidate[],
  recordedAt: Date,
): string | null {
  let nearest: PracticeCandidate | null = null;
  for (const session of sessions) {
    if (session.kind !== PRACTICE_KIND) continue;
    if (distanceFrom(recordedAt, session) > NEAREST_PRACTICE_WINDOW_MILLISECONDS) continue;
    if (nearest === null || distanceFrom(recordedAt, session) < distanceFrom(recordedAt, nearest)) {
      nearest = session;
    }
  }
  return nearest?.id ?? null;
}

export function selectPracticeOptions<TSession extends PracticeCandidate>(
  sessions: readonly TSession[],
): TSession[] {
  return sessions
    .filter((session) => session.kind === PRACTICE_KIND)
    .toSorted((left, right) => Date.parse(right.date) - Date.parse(left.date));
}

const DATE_TIME_PAD = 2;
const MONTH_OFFSET = 1;

function pad(value: number): string {
  return String(value).padStart(DATE_TIME_PAD, '0');
}

export function toDateTimeLocalValue(date: Date): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + MONTH_OFFSET)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const DATE_TIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function parseDateTimeLocalValue(value: string): Date | null {
  if (!DATE_TIME_LOCAL_PATTERN.test(value)) return null;
  const candidate = new Date(value);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}

export const takeUploadFormSchema = z.object({
  file: z
    .instanceof(File)
    .nullable()
    .refine((file) => file !== null && validateTakeFile(file).kind === 'ok'),
  recordedAt: z.string().refine((value) => parseDateTimeLocalValue(value) !== null),
  sessionId: z.string(),
});

export type TakeUploadFormValues = z.infer<typeof takeUploadFormSchema>;

export type TakeFileMessage =
  | { readonly key: 'takes.fileErrors.tooLarge'; readonly maxMebibytes: number }
  | { readonly key: 'takes.fileErrors.notAudio' }
  | { readonly key: 'takes.fileErrors.empty' };

// @FollowsBlueprint core-message-selection
export function selectTakeFileMessage(file: TakeFileCandidate | null): TakeFileMessage | null {
  if (file === null) return null;
  const verdict = validateTakeFile(file);
  if (verdict.kind === 'too-large') {
    return { key: 'takes.fileErrors.tooLarge', maxMebibytes: verdict.maxMebibytes };
  }
  if (verdict.kind === 'not-audio') return { key: 'takes.fileErrors.notAudio' };
  if (verdict.kind === 'empty') return { key: 'takes.fileErrors.empty' };
  return null;
}

export function readSessionChoice(sessionId: string): string | null {
  return sessionId === '' ? null : sessionId;
}

export function selectQueueFailure(queueing: QueueTakeOutcome): TakeNotSavedReason | null {
  return queueing === 'queued' ? null : queueing;
}
