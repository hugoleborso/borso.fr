/** @Feature auth */

import type { AnimationEventHandler, JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { composeClassName } from '../atoms/class-name.utils';
import { PragmaMark } from '../atoms/PragmaMark';
import type { ConnectionNote, OpeningOverlay } from './session-gate.core';

export interface OpeningScreenProps {
  readonly phase: OpeningOverlay;
  readonly connectionNote: ConnectionNote;
  readonly onRetry: () => void;
  readonly onAnimationStart: AnimationEventHandler<HTMLDivElement>;
  readonly onAnimationEnd: AnimationEventHandler<HTMLDivElement>;
}

const OVERLAY_CLASS =
  'fixed inset-0 z-50 flex h-dvh w-full flex-col items-center justify-center bg-paper px-4';

const CONTENT_CLASS = 'w-full max-w-sm flex-col items-center gap-8 text-center';

const PHASE_LOOK = {
  restoring: {
    overlay: '',
    content: 'hidden',
    motion: 'still',
    isHidden: false,
    status: 'loading',
    action: 'none',
  },
  opening: {
    overlay: '',
    content: 'flex',
    motion: 'playing',
    isHidden: false,
    status: 'loading',
    action: 'none',
  },
  'opening-failed': {
    overlay: '',
    content: 'flex',
    motion: 'still',
    isHidden: false,
    status: 'failure',
    action: 'retry',
  },
  leaving: {
    overlay: 'pointer-events-none animate-downbeat-exit motion-reduce:hidden',
    content: 'flex',
    motion: 'playing',
    isHidden: true,
    status: 'loading',
    action: 'none',
  },
} as const;

function LoadingCaption(): JSX.Element {
  const { t } = useTranslation();
  return (
    <p className="m-0 font-display text-title italic text-ink-soft animate-downbeat-caption motion-reduce:animate-none">
      {t('opening.loading')}
    </p>
  );
}

function NoConnectionNote(): null {
  return null;
}

function OfflineNote(): JSX.Element {
  const { t } = useTranslation();
  return <p className="m-0 text-meta text-ink-soft">{t('opening.offline')}</p>;
}

const NOTE_BY_CONNECTION = { online: NoConnectionNote, offline: OfflineNote } as const;

interface FailureNoticeProps {
  readonly connectionNote: ConnectionNote;
}

function FailureNotice({ connectionNote }: FailureNoticeProps): JSX.Element {
  const { t } = useTranslation();
  const Note = NOTE_BY_CONNECTION[connectionNote];
  return (
    <>
      <p className="m-0 max-w-72 text-body text-ink text-balance">{t('opening.failed')}</p>
      <Note />
    </>
  );
}

interface RetryProps {
  readonly onRetry: () => void;
}

function Retry({ onRetry }: RetryProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Button variant="primary" icon="refresh" onClick={onRetry}>
      {t('opening.retry')}
    </Button>
  );
}

// @FollowsBlueprint organism-presentational
export function OpeningScreen({
  phase,
  connectionNote,
  onRetry,
  onAnimationStart,
  onAnimationEnd,
}: OpeningScreenProps): JSX.Element {
  const look = PHASE_LOOK[phase];
  const statusView = {
    loading: <LoadingCaption />,
    failure: <FailureNotice connectionNote={connectionNote} />,
  }[look.status];
  const actionView = { none: null, retry: <Retry onRetry={onRetry} /> }[look.action];
  return (
    <div
      data-opening-phase={phase}
      aria-hidden={look.isHidden}
      className={composeClassName(OVERLAY_CLASS, look.overlay)}
      onAnimationStart={onAnimationStart}
      onAnimationEnd={onAnimationEnd}
    >
      <div className={composeClassName(look.content, CONTENT_CLASS)}>
        <PragmaMark motion={look.motion} className="w-36 sm:w-44" />
        <div role="status" className="flex min-h-12 flex-col items-center gap-1">
          {statusView}
        </div>
        {actionView}
      </div>
    </div>
  );
}
