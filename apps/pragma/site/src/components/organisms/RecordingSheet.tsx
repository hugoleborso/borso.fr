/** @Feature takes */

import { type JSX, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { holdScreenAwakeWhileAttached } from '../../lib/scene-wake-lock.adapter';
import {
  readSecondClock,
  readServerSecondClock,
  subscribeSecondClock,
} from '../../lib/second-clock.store';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { PulsingDot } from '../atoms/PulsingDot';
import { formatElapsedClock } from './recording-sheet.core';
import { type RecordingSheetController, useRecordingSheet } from './recording-sheet.hook';
import { Sheet } from '../molecules/Sheet';
import { TakeUploadForm } from './TakeUploadForm';

export interface RecordingSheetProps {
  readonly songId: string;
  readonly songTitle: string;
  readonly sessionId: string | null;
  readonly isCompact?: boolean;
}

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
  const controller = useRecordingSheet();
  return (
    <>
      <IconButton
        variant={isCompact ? 'quiet' : 'secondary'}
        size={isCompact ? 'sm' : 'md'}
        icon="mic"
        label={t('takes.recordAria', { title: songTitle })}
        disabled={controller.view.isOpen}
        onClick={() => void controller.start({ songId, songTitle, sessionId })}
      />
      <RecordingSheetDialogs controller={controller} />
    </>
  );
}

export interface RecordingSheetDialogsProps {
  readonly controller: RecordingSheetController;
}

// @FollowsBlueprint organism-presentational
export function RecordingSheetDialogs({
  controller,
}: RecordingSheetDialogsProps): JSX.Element | null {
  const { t } = useTranslation();
  const { subject, view } = controller;
  if (subject === null) return null;
  const songTitle = subject.songTitle;
  return (
    <>
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
          onCancel={controller.refuseCancelWhileBusy}
          onClose={controller.close}
          footer={
            <>
              {view.offersUpload ? (
                <Button variant="secondary" icon="upload" onClick={controller.uploadInstead}>
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
                <Button
                  variant="primary"
                  size="lg"
                  icon="stop"
                  onClick={() => void controller.stop()}
                >
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
      {controller.isUploadOpen ? (
        <TakeUploadForm
          songId={subject.songId}
          songTitle={songTitle}
          presetSessionId={subject.sessionId}
          onClose={controller.closeUpload}
        />
      ) : null}
    </>
  );
}
