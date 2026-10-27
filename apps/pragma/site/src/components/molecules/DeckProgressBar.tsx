/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { selectSeenShare, selectSongsLeft } from '../../routes/setlists/vote-deck.core';
import { Overline } from '../atoms/Overline';

export interface DeckProgressBarProps {
  readonly deckLength: number;
  readonly cardIndex: number;
}

// @FollowsBlueprint molecule-presentational
export function DeckProgressBar({ deckLength, cardIndex }: DeckProgressBarProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="px-4">
      <div className="flex items-baseline justify-between gap-3">
        <Overline>{t('voting.songsLeftLabel')}</Overline>
        <span className="font-sans font-semibold tabular-nums text-ink">
          {selectSongsLeft(deckLength, cardIndex)} / {deckLength}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-rule overflow-hidden">
        <div
          className="h-full bg-ink-soft"
          style={{ width: `${String(selectSeenShare(deckLength, cardIndex))}%` }}
        />
      </div>
    </div>
  );
}
