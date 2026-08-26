/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { scrollCurrentPillIntoView } from '../../lib/scene-scroll.adapter';
import type { ScenePill, ScenePillState } from '../../routes/setlists/setlist-scene.core';
import { composeClassName } from '../atoms/class-name.utils';

interface SceneSongPillProps {
  readonly pill: ScenePill;
  readonly onSelect: () => void;
}

const SHELL_CLASS_BY_STATE = {
  current: 'bg-accent border-accent',
  next: 'bg-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.2)]',
  upcoming: 'bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.1)]',
  done: 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] opacity-55',
} as const satisfies Readonly<Record<ScenePillState, string>>;

const TITLE_CLASS_BY_STATE = {
  current: 'text-bg-elev',
  next: 'text-stage-ink',
  upcoming: 'text-stage-ink',
  done: 'text-stage-ink-dim line-through',
} as const satisfies Readonly<Record<ScenePillState, string>>;

const CAPTION_KEY_BY_STATE = {
  current: 'scene.pillNow',
  next: 'scene.pillNext',
  upcoming: null,
  done: null,
} as const satisfies Readonly<Record<ScenePillState, string | null>>;

// @FollowsBlueprint molecule-presentational
export function SceneSongPill({ pill, onSelect }: SceneSongPillProps): JSX.Element {
  const { t } = useTranslation();
  const captionKey = CAPTION_KEY_BY_STATE[pill.state];
  const isCurrent = pill.state === 'current';
  return (
    <button
      type="button"
      ref={isCurrent ? scrollCurrentPillIntoView : null}
      aria-current={isCurrent ? 'true' : undefined}
      onClick={onSelect}
      className={composeClassName(
        'shrink-0 min-w-[9.5rem] max-w-[13rem] min-h-11 flex flex-col items-start gap-0.5',
        'px-3.5 py-2 rounded-lg border text-left cursor-pointer transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-stage-ink',
        SHELL_CLASS_BY_STATE[pill.state],
      )}
    >
      <span
        className={composeClassName(
          'font-mono text-[9.5px] tracking-[0.18em] uppercase',
          isCurrent ? 'text-bg-elev/75' : 'text-stage-ink-dim',
        )}
      >
        {pill.ordinal}
        {captionKey === null ? null : ` · ${t(captionKey)}`}
      </span>
      <span
        className={composeClassName(
          'font-display italic text-base leading-tight truncate max-w-full',
          TITLE_CLASS_BY_STATE[pill.state],
        )}
      >
        {pill.title ?? t('scene.unknownSong')}
      </span>
      <span
        className={composeClassName(
          'text-[10.5px] truncate max-w-full',
          isCurrent ? 'text-bg-elev/80' : 'text-stage-ink-dim',
        )}
      >
        {pill.subtitle}
      </span>
    </button>
  );
}
