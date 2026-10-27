/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScenePill } from '../../routes/setlists/setlist-scene.core';
import { IconButton } from '../atoms/IconButton';
import { SceneSongPill } from '../molecules/SceneSongPill';

interface SceneTransportProps {
  readonly pills: readonly ScenePill[];
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onSelect: (index: number) => void;
}

// @FollowsBlueprint organism-presentational
export function SceneTransport({
  pills,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onSelect,
}: SceneTransportProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="shrink-0 flex items-stretch gap-2 px-3 sm:px-6 py-3 border-t border-stage-line bg-stage-bg pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <IconButton
        variant="stage"
        icon="chevL"
        label={t('scene.previousSong')}
        onClick={onPrevious}
        disabled={!hasPrevious}
      />
      <nav
        aria-label={t('scene.rail')}
        className="flex-1 min-w-0 flex items-stretch gap-2 overflow-x-auto py-0.5 [scrollbar-width:thin]"
      >
        {pills.map((pill, index) => (
          <SceneSongPill key={pill.entryId} pill={pill} onSelect={() => onSelect(index)} />
        ))}
      </nav>
      <IconButton
        variant={hasNext ? 'primary' : 'stage'}
        icon="chevR"
        label={t('scene.nextSong')}
        onClick={onNext}
        disabled={!hasNext}
      />
    </div>
  );
}
