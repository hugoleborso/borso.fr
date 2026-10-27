/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { scrollCurrentPillIntoView } from '../../lib/scene-scroll.adapter';
import type { ScenePill, ScenePillState } from '../../routes/setlists/setlist-scene.core';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';

interface SceneSongPillProps {
  readonly pill: ScenePill;
  readonly onSelect: () => void;
}

const SHELL_CLASS_BY_STATE = {
  current: 'bg-accent border-accent',
  next: 'bg-stage-press border-stage-line',
  upcoming: 'bg-stage-hover border-stage-line',
  done: 'bg-stage-hover border-stage-hover opacity-55',
} as const satisfies Readonly<Record<ScenePillState, string>>;

const TITLE_CLASS_BY_STATE = {
  current: 'text-on-accent',
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

const ICON_BY_STATE = {
  current: 'play',
  next: 'arrowR',
  upcoming: 'chevR',
  done: 'check',
} as const satisfies Readonly<Record<ScenePillState, IconName>>;

// @FollowsBlueprint molecule-presentational
export function SceneSongPill({ pill, onSelect }: SceneSongPillProps): JSX.Element {
  const { t } = useTranslation();
  const captionKey = CAPTION_KEY_BY_STATE[pill.state];
  const isCurrent = pill.state === 'current';
  return (
    // eslint-disable-next-line borso/no-raw-interactive-element -- a scene view pill draws on the stage palette, which the design system's buttons do not carry
    <button
      type="button"
      ref={isCurrent ? scrollCurrentPillIntoView : null}
      aria-current={isCurrent ? 'true' : undefined}
      onClick={onSelect}
      className={composeClassName(
        'shrink-0 min-w-[9.5rem] max-w-[13rem] min-h-11 flex flex-col items-start gap-0.5',
        'px-3.5 py-2 rounded-lg border text-left cursor-pointer transition-colors',
        'focus-visible:outline-3 focus-visible:outline-stage-ink',
        SHELL_CLASS_BY_STATE[pill.state],
      )}
    >
      <span
        className={composeClassName(
          'text-label tracking-[0.18em] uppercase',
          isCurrent ? 'text-on-accent' : 'text-stage-ink-dim',
        )}
      >
        <Icon
          name={ICON_BY_STATE[pill.state]}
          size="sm"
          className="mr-1 inline-block align-middle"
        />
        {pill.ordinal}
        {captionKey === null ? null : ` · ${t(captionKey)}`}
      </span>
      <span
        className={composeClassName(
          'font-display text-body truncate max-w-full',
          TITLE_CLASS_BY_STATE[pill.state],
        )}
      >
        {pill.title ?? t('scene.unknownSong')}
      </span>
      <span
        className={composeClassName(
          'text-label truncate max-w-full',
          isCurrent ? 'text-on-accent' : 'text-stage-ink-dim',
        )}
      >
        {pill.subtitle}
      </span>
    </button>
  );
}
