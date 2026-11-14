/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Chip } from '../atoms/Chip';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { ADD_SONGS_FILTERS, type AddSongsFilter } from './add-songs.core';

export interface AddSongsSearchBarProps {
  readonly query: string;
  readonly filter: AddSongsFilter;
  readonly onSearchMount: () => () => void;
  readonly onQueryChange: (query: string) => void;
  readonly onFilterChange: (filter: AddSongsFilter) => void;
}

const FILTER_LABEL_KEY = {
  'not-in-setlist': 'setlist.addSongsFilterNotInSetlist',
  'concert-ready': 'setlist.addSongsFilterConcertReady',
  rehearsed: 'setlist.addSongsFilterRehearsed',
  learning: 'setlist.addSongsFilterToLearn',
  ideas: 'setlist.addSongsFilterIdeas',
} as const satisfies Readonly<Record<AddSongsFilter, string>>;

// @FollowsBlueprint molecule-presentational
export function AddSongsSearchBar({
  onSearchMount,
  ...props
}: AddSongsSearchBarProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft">
          <Icon name="search" />
        </span>
        <Input
          ref={onSearchMount}
          type="search"
          data-sheet-focus
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
          placeholder={t('setlist.addSongsSearch')}
          aria-label={t('setlist.addSongsSearch')}
          className="pl-9"
        />
      </div>
      <div
        role="group"
        aria-label={t('setlist.addSongsFilterLabel')}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
      >
        {ADD_SONGS_FILTERS.map((option) => (
          <Chip
            key={option}
            pressed={option === props.filter}
            onPress={() => props.onFilterChange(option)}
            className="shrink-0"
          >
            {t(FILTER_LABEL_KEY[option])}
          </Chip>
        ))}
      </div>
    </>
  );
}
