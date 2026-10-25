/** @Feature takes */

import { type JSX, type SyntheticEvent, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { recordTakeBreadcrumb } from '../../observability/error-reporting.adapter';
import { openDialogOnAttach } from '../../lib/modal-dialog.adapter';
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
import { PulsingDot } from '../atoms/PulsingDot';
import {
  decidePhaseAfterQueueing,
  formatElapsedClock,
  type RecordingEnd,
  type RecordingSheetPhase,
  selectPhaseAfterStart,
  selectRecordingSheetView,
} from './recording-sheet.core';
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
const RECORDING_DOT_COLOR = 'var(--color-danger)';
const ALERT_CLASS = 'text-sm text-danger m-0';
const STATUS_CLASS = 'text-sm text-ink-500 m-0';
const COMPACT_ICON_SIZE = 14;
const ICON_BUTTON_ICON_SIZE = 22;

interface ElapsedClockProps {
  readonly startedAtEpochMilliseconds: number;
}

function ElapsedClock({ startedAtEpochMilliseconds }: ElapsedClockProps): JSX.Element {
  const now = useSyncExternalStore(subscribeSecondClock, readSecondClock, readServerSecondClock);
  return (
    <span className="font-mono text-3xl tabular-nums text-ink-900">
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
      <Button
        variant={isCompact ? 'ghost' : 'default'}
        size={isCompact ? 'sm' : 'icon'}
        aria-label={t('takes.recordAria', { title: songTitle })}
        title={t('takes.recordAria', { title: songTitle })}
        disabled={view.isOpen}
        onClick={() => void start()}
      >
        <Icon name="mic" size={isCompact ? COMPACT_ICON_SIZE : ICON_BUTTON_ICON_SIZE} />
      </Button>
      {view.isOpen ? (
        <dialog
          ref={openDialogOnAttach}
          onCancel={refuseCancelWhileBusy}
          onClose={close}
          aria-label={t('takes.recording.title', { title: songTitle })}
          className="m-auto w-[calc(100vw-2rem)] sm:w-[26rem] max-w-[26rem] rounded-lg border border-line bg-bg-elev p-0 backdrop:bg-ink-900/40"
        >
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {view.isRecording ? (
                <PulsingDot color={RECORDING_DOT_COLOR} />
              ) : (
                <Icon name="mic" size={14} />
              )}
              <span className="text-sm font-medium text-ink-900 truncate">{songTitle}</span>
            </div>
            {view.elapsedSince === null ? null : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <ElapsedClock startedAtEpochMilliseconds={view.elapsedSince} />
                <span ref={holdScreenAwakeWhileAttached} className="text-xs text-ink-400">
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
            <div className="flex flex-wrap justify-end gap-2">
              {view.offersUpload ? (
                <Button variant="default" onClick={uploadInstead}>
                  <Icon name="upload" size={14} />
                  {t('takes.upload')}
                </Button>
              ) : null}
              {view.download === null ? null : (
                <a
                  href={view.download.url}
                  download={view.download.name}
                  className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-md border border-line-strong text-[13px] font-medium text-ink-900 no-underline"
                >
                  <Icon name="download" size={14} />
                  {t('takes.download')}
                </a>
              )}
              {view.showsStop ? (
                <Button variant="accent" size="lg" onClick={() => void stop()}>
                  <Icon name="stop" size={14} />
                  {t('takes.recording.stop')}
                </Button>
              ) : (
                <Button variant="ghost" disabled={view.isBusy} onClick={close}>
                  {t('common.close')}
                </Button>
              )}
            </div>
          </div>
        </dialog>
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
