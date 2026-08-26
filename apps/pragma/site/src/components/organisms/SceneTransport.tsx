/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScenePill } from '../../routes/setlists/setlist-scene.core';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
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
    <div className="shrink-0 flex items-stretch gap-2 px-3 sm:px-6 py-3 border-t border-[rgba(255,255,255,0.08)] bg-stage-bg pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <Button
        variant="stage"
        onClick={onPrevious}
        disabled={!hasPrevious}
        aria-label={t('scene.previousSong')}
        className="shrink-0"
      >
        <Icon name="chevL" size={16} />
      </Button>
      <nav
        aria-label={t('scene.rail')}
        className="flex-1 min-w-0 flex items-stretch gap-2 overflow-x-auto py-0.5 [scrollbar-width:thin]"
      >
        {pills.map((pill, index) => (
          <SceneSongPill key={pill.entryId} pill={pill} onSelect={() => onSelect(index)} />
        ))}
      </nav>
      <Button
        variant={hasNext ? 'accent' : 'stage'}
        onClick={onNext}
        disabled={!hasNext}
        aria-label={t('scene.nextSong')}
        className="shrink-0"
      >
        <Icon name="chevR" size={16} />
      </Button>
    </div>
  );
}
