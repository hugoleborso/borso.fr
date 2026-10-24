/** @Feature takes */

import { normalizeTakeContentType, takeFileExtensionOf } from '@domain/take-upload.core';
import type { QueueTakeOutcome, TakeNotSavedReason } from '../../lib/take-queue.core';

export interface TakeDownload {
  readonly url: string;
  readonly name: string;
}

export type RecordingSheetPhase =
  | { readonly kind: 'closed' }
  | { readonly kind: 'starting' }
  | { readonly kind: 'recording'; readonly startedAtEpochMilliseconds: number }
  | { readonly kind: 'saving' }
  | { readonly kind: 'denied' }
  | { readonly kind: 'unsupported' }
  | { readonly kind: 'interrupted' }
  | {
      readonly kind: 'not-saved';
      readonly reason: TakeNotSavedReason;
      readonly download: TakeDownload;
    };

export type RecordingMessageKey =
  | 'takes.recording.starting'
  | 'takes.recording.saving'
  | 'takes.recording.denied'
  | 'takes.recording.unsupported'
  | 'takes.recording.interrupted'
  | 'takes.recording.quotaExceeded'
  | 'takes.recording.queueFailed'
  | 'takes.recording.unplayable';

export interface RecordingSheetView {
  readonly isOpen: boolean;
  readonly isRecording: boolean;
  readonly isBusy: boolean;
  readonly messageKey: RecordingMessageKey | null;
  readonly isAlert: boolean;
  readonly elapsedSince: number | null;
  readonly showsStop: boolean;
  readonly offersUpload: boolean;
  readonly download: TakeDownload | null;
}

const QUIET: RecordingSheetView = {
  isOpen: true,
  isRecording: false,
  isBusy: false,
  messageKey: null,
  isAlert: false,
  elapsedSince: null,
  showsStop: false,
  offersUpload: false,
  download: null,
};

export const TAKE_NOT_SAVED_MESSAGE_KEY: Readonly<Record<TakeNotSavedReason, RecordingMessageKey>> =
  {
    'quota-exceeded': 'takes.recording.quotaExceeded',
    failed: 'takes.recording.queueFailed',
    unplayable: 'takes.recording.unplayable',
  };

// @FollowsBlueprint core-message-selection
export function selectRecordingSheetView(phase: RecordingSheetPhase): RecordingSheetView {
  switch (phase.kind) {
    case 'closed':
      return { ...QUIET, isOpen: false };
    case 'starting':
      return { ...QUIET, isBusy: true, messageKey: 'takes.recording.starting' };
    case 'recording':
      return {
        ...QUIET,
        isRecording: true,
        isBusy: true,
        elapsedSince: phase.startedAtEpochMilliseconds,
        showsStop: true,
      };
    case 'saving':
      return { ...QUIET, isBusy: true, messageKey: 'takes.recording.saving' };
    case 'denied':
      return { ...QUIET, messageKey: 'takes.recording.denied', isAlert: true, offersUpload: true };
    case 'unsupported':
      return {
        ...QUIET,
        messageKey: 'takes.recording.unsupported',
        isAlert: true,
        offersUpload: true,
      };
    case 'interrupted':
      return { ...QUIET, messageKey: 'takes.recording.interrupted', isAlert: true };
    case 'not-saved':
      return {
        ...QUIET,
        messageKey: TAKE_NOT_SAVED_MESSAGE_KEY[phase.reason],
        isAlert: true,
        download: phase.download,
      };
  }
}

export type RecordingStartAnswer =
  | {
      readonly kind: 'started';
      readonly recording: { readonly startedAtEpochMilliseconds: number };
    }
  | { readonly kind: 'denied' }
  | { readonly kind: 'unsupported' };

// @FollowsBlueprint core-decision
export function selectPhaseAfterStart(answer: RecordingStartAnswer): RecordingSheetPhase {
  if (answer.kind !== 'started') return { kind: answer.kind };
  return {
    kind: 'recording',
    startedAtEpochMilliseconds: answer.recording.startedAtEpochMilliseconds,
  };
}

export type RecordingEnd = 'stopped' | 'interrupted';

export interface QueueingReport {
  readonly end: RecordingEnd;
  readonly result: QueueTakeOutcome;
  readonly songTitle: string;
  readonly contentType: string;
  readonly readDownloadUrl: () => string;
}

// @FollowsBlueprint core-decision
export function decidePhaseAfterQueueing(report: QueueingReport): RecordingSheetPhase {
  if (report.result !== 'queued') {
    return {
      kind: 'not-saved',
      reason: report.result,
      download: {
        url: report.readDownloadUrl(),
        name: buildTakeDownloadName(report.songTitle, report.contentType),
      },
    };
  }
  return report.end === 'interrupted' ? { kind: 'interrupted' } : { kind: 'closed' };
}

const MILLISECONDS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const CLOCK_PAD = 2;

export function formatElapsedClock(elapsedMilliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMilliseconds / MILLISECONDS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${String(minutes).padStart(CLOCK_PAD, '0')}:${String(seconds).padStart(CLOCK_PAD, '0')}`;
}

const FALLBACK_EXTENSION = 'audio';

export function buildTakeDownloadName(songTitle: string, contentType: string): string {
  const normalized = normalizeTakeContentType(contentType);
  const extension = normalized === null ? FALLBACK_EXTENSION : takeFileExtensionOf(normalized);
  return `${songTitle}.${extension}`;
}
