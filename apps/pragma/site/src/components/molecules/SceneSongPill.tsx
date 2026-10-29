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

const ICON_BY_STATE = {
  current: 'play',
  next: 'arrowR',
  upcoming: 'chevR',
  done: 'check',
} as const satisfies Readonly<Record<ScenePillState, IconName>>;

// @FollowsBlueprint molecule-presentational
export function SceneSongPill({ pill, onSelect }: SceneSongPillProps): JSX.Element {
  const { t } = useTranslation();
  const isCurrent = pill.state === 'current';
  return (
    // eslint-disable-next-line borso/no-raw-interactive-element -- a scene view pill draws on the stage palette, which the design system's buttons do not carry
    <button
      type="button"
      ref={isCurrent ? scrollCurrentPillIntoView : null}
      aria-current={isCurrent ? 'true' : undefined}
      aria-label={`${pill.ordinal} ${pill.title ?? t('scene.unknownSong')}`}
      onClick={onSelect}
      className={composeClassName(
        'shrink-0 min-h-11 flex items-center gap-1.5 px-3 rounded-pill border cursor-pointer',
        'transition-colors focus-visible:outline-3 focus-visible:outline-stage-ink',
        SHELL_CLASS_BY_STATE[pill.state],
      )}
    >
      <Icon
        name={ICON_BY_STATE[pill.state]}
        size="sm"
        className={isCurrent ? 'text-on-accent' : 'text-stage-ink-dim'}
      />
      <span
        className={composeClassName(
          'font-mono text-label tabular-nums',
          isCurrent ? 'text-on-accent' : 'text-stage-ink-dim',
        )}
      >
        {pill.ordinal}
      </span>
      {isCurrent ? null : (
        <span
          className={composeClassName(
            'max-w-[9rem] truncate text-meta',
            TITLE_CLASS_BY_STATE[pill.state],
          )}
        >
          {pill.title ?? t('scene.unknownSong')}
        </span>
      )}
    </button>
  );
}
