/** @Feature takes */

import { type JSX, type SyntheticEvent, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { recordTakeBreadcrumb } from '../../observability/error-reporting.adapter';
import { readBrowserRecorderEnvironment, startRecording } from '../../lib/recorder.adapter';
import type { ActiveRecording, RecordingOutcome } from '../../lib/recorder.core';
import { holdScreenAwakeWhileAttached } from '../../lib/scene-wake-lock.adapter';
import {
  readSecondClock,
  readServerSecondClock,
  subscribeSecondClock,
} from '../../lib/second-clock.store';
import { roundDurationSeconds } from '../../lib/take-queue.core';
import { queueTake } from '../../lib/take-queue.setup';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { PulsingDot } from '../atoms/PulsingDot';
import {
  decidePhaseAfterQueueing,
  formatElapsedClock,
  type RecordingEnd,
  type RecordingSheetPhase,
  selectPhaseAfterStart,
  selectRecordingSheetView,
} from './recording-sheet.core';
import { Sheet } from '../molecules/Sheet';
import { TakeUploadForm } from './TakeUploadForm';

export interface RecordingSheetProps {
  readonly songId: string;
  readonly songTitle: string;
  readonly sessionId: string | null;
  readonly isCompact?: boolean;
}

const CLOSED: RecordingSheetPhase = { kind: 'closed' };
const SAVING: RecordingSheetPhase = { kind: 'saving' };
const STARTING: RecordingSheetPhase = { kind: 'starting' };
const ALERT_CLASS = 'text-meta text-danger m-0';
const STATUS_CLASS = 'text-meta text-ink-soft m-0';

interface ElapsedClockProps {
  readonly startedAtEpochMilliseconds: number;
}

function ElapsedClock({ startedAtEpochMilliseconds }: ElapsedClockProps): JSX.Element {
  const now = useSyncExternalStore(subscribeSecondClock, readSecondClock, readServerSecondClock);
  return (
    <span className="font-mono text-display tabular-nums text-ink">
      {formatElapsedClock(now - startedAtEpochMilliseconds)}
    </span>
  );
}

// @FollowsBlueprint organism-query-owning
export function RecordingSheet({
  songId,
  songTitle,
  sessionId,
  isCompact = false,
}: RecordingSheetProps): JSX.Element {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<RecordingSheetPhase>(CLOSED);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const recording = useRef<ActiveRecording | null>(null);
  const view = selectRecordingSheetView(phase);

  const keep = async (end: RecordingEnd, outcome: RecordingOutcome): Promise<void> => {
    const queueing = await queueTake(
      {
        songId,
        sessionId,
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
        songTitle,
        contentType: outcome.contentType,
        readDownloadUrl: () => URL.createObjectURL(outcome.audio),
      }),
    );
  };

  const keepInterrupted = (outcome: RecordingOutcome): void => {
    recording.current = null;
    recordTakeBreadcrumb('RecordingInterrupted');
    setPhase(SAVING);
    void keep('interrupted', outcome);
  };

  const start = async (): Promise<void> => {
    setPhase(STARTING);
    const answer = await startRecording(readBrowserRecorderEnvironment(), keepInterrupted);
    recording.current = 'recording' in answer ? answer.recording : null;
    setPhase(selectPhaseAfterStart(answer));
  };

  const stop = async (): Promise<void> => {
    const active = recording.current;
    if (active === null) return;
    recording.current = null;
    setPhase(SAVING);
    await keep('stopped', await active.stop());
  };

  const close = (): void => {
    const { download } = view;
    if (download !== null) URL.revokeObjectURL(download.url);
    setPhase(CLOSED);
  };

  const refuseCancelWhileBusy = (event: SyntheticEvent<HTMLDialogElement>): void => {
    if (view.isBusy) event.preventDefault();
  };

  const uploadInstead = (): void => {
    setPhase(CLOSED);
    setIsUploadOpen(true);
  };

  return (
    <>
      <IconButton
        variant={isCompact ? 'quiet' : 'secondary'}
        size={isCompact ? 'sm' : 'md'}
        icon="mic"
        label={t('takes.recordAria', { title: songTitle })}
        disabled={view.isOpen}
        onClick={() => void start()}
      />
      {view.isOpen ? (
        <Sheet
          title={
            <span className="flex min-w-0 items-center gap-2">
              {view.isRecording ? <PulsingDot tone="danger" /> : <Icon name="mic" />}
              <span className="truncate">{songTitle}</span>
            </span>
          }
          label={t('takes.recording.title', { title: songTitle })}
          isDismissible={false}
          isTitleARecordName
          isCloseDisabled={view.isBusy}
          onCancel={refuseCancelWhileBusy}
          onClose={close}
          footer={
            <>
              {view.offersUpload ? (
                <Button variant="secondary" icon="upload" onClick={uploadInstead}>
                  {t('takes.upload')}
                </Button>
              ) : null}
              {view.download === null ? null : (
                <a
                  href={view.download.url}
                  download={view.download.name}
                  className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-glass px-4 text-body font-medium text-ink no-underline"
                >
                  <Icon name="download" size="md" className="text-accent" />
                  {t('takes.download')}
                </a>
              )}
              {view.showsStop ? (
                <Button variant="primary" size="lg" icon="stop" onClick={() => void stop()}>
                  {t('takes.recording.stop')}
                </Button>
              ) : null}
            </>
          }
        >
          <div className="flex flex-col gap-3">
            {view.elapsedSince === null ? null : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <ElapsedClock startedAtEpochMilliseconds={view.elapsedSince} />
                <span ref={holdScreenAwakeWhileAttached} className="text-meta text-ink-soft">
                  {t('takes.recording.screenAwake')}
                </span>
              </div>
            )}
            {view.messageKey === null ? null : (
              <p
                className={view.isAlert ? ALERT_CLASS : STATUS_CLASS}
                role={view.isAlert ? 'alert' : 'status'}
              >
                {t(view.messageKey)}
              </p>
            )}
          </div>
        </Sheet>
      ) : null}
      {isUploadOpen ? (
        <TakeUploadForm
          songId={songId}
          songTitle={songTitle}
          presetSessionId={sessionId}
          onClose={() => setIsUploadOpen(false)}
        />
      ) : null}
    </>
  );
}
