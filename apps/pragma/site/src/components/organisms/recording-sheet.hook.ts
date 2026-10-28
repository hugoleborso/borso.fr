/** @Feature takes */

import { type SyntheticEvent, useRef, useState } from 'react';
import { recordTakeBreadcrumb } from '../../observability/error-reporting.adapter';
import { readBrowserRecorderEnvironment, startRecording } from '../../lib/recorder.adapter';
import type { ActiveRecording, RecordingOutcome } from '../../lib/recorder.core';
import { roundDurationSeconds } from '../../lib/take-queue.core';
import { queueTake } from '../../lib/take-queue.setup';
import {
  decidePhaseAfterQueueing,
  type RecordingEnd,
  type RecordingSheetPhase,
  type RecordingSheetView,
  selectPhaseAfterStart,
  selectRecordingSheetView,
} from './recording-sheet.core';

export interface RecordingSubject {
  readonly songId: string;
  readonly songTitle: string;
  readonly sessionId: string | null;
}

export interface RecordingSheetController {
  readonly subject: RecordingSubject | null;
  readonly view: RecordingSheetView;
  readonly isUploadOpen: boolean;
  readonly start: (subject: RecordingSubject) => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly close: () => void;
  readonly refuseCancelWhileBusy: (event: SyntheticEvent<HTMLDialogElement>) => void;
  readonly uploadInstead: () => void;
  readonly closeUpload: () => void;
}

const CLOSED: RecordingSheetPhase = { kind: 'closed' };
const SAVING: RecordingSheetPhase = { kind: 'saving' };
const STARTING: RecordingSheetPhase = { kind: 'starting' };

// @FollowsBlueprint hook-timer-owned-by-handlers
export function useRecordingSheet(): RecordingSheetController {
  const [phase, setPhase] = useState<RecordingSheetPhase>(CLOSED);
  const [subject, setSubject] = useState<RecordingSubject | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const recording = useRef<ActiveRecording | null>(null);
  const view = selectRecordingSheetView(phase);

  const keep = async (
    recorded: RecordingSubject,
    end: RecordingEnd,
    outcome: RecordingOutcome,
  ): Promise<void> => {
    const queueing = await queueTake(
      {
        songId: recorded.songId,
        sessionId: recorded.sessionId,
        recordedAt: new Date(outcome.startedAtEpochMilliseconds),
        durationSeconds: roundDurationSeconds(outcome.durationMilliseconds),
        rawContentType: outcome.contentType,
        source: 'live',
      },
      outcome.audio,
    );
    setPhase(
      decidePhaseAfterQueueing({
        end,
        result: queueing,
        songTitle: recorded.songTitle,
        contentType: outcome.contentType,
        readDownloadUrl: () => URL.createObjectURL(outcome.audio),
      }),
    );
  };

  const start = async (recorded: RecordingSubject): Promise<void> => {
    setSubject(recorded);
    setPhase(STARTING);
    const keepInterrupted = (outcome: RecordingOutcome): void => {
      recording.current = null;
      recordTakeBreadcrumb('RecordingInterrupted');
      setPhase(SAVING);
      void keep(recorded, 'interrupted', outcome);
    };
    const answer = await startRecording(readBrowserRecorderEnvironment(), keepInterrupted);
    recording.current = 'recording' in answer ? answer.recording : null;
    setPhase(selectPhaseAfterStart(answer));
  };

  const stop = async (): Promise<void> => {
    const active = recording.current;
    if (active === null || subject === null) return;
    recording.current = null;
    setPhase(SAVING);
    await keep(subject, 'stopped', await active.stop());
  };

  return {
    subject,
    view,
    isUploadOpen,
    start,
    stop,
    close: () => {
      const { download } = view;
      if (download !== null) URL.revokeObjectURL(download.url);
      setPhase(CLOSED);
    },
    refuseCancelWhileBusy: (event) => {
      if (view.isBusy) event.preventDefault();
    },
    uploadInstead: () => {
      setPhase(CLOSED);
      setIsUploadOpen(true);
    },
    closeUpload: () => setIsUploadOpen(false),
  };
}
