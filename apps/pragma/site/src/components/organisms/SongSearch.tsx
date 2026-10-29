/** @Feature songs */

import { type JSX, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api.client';
import { debounce } from '../../lib/debounce.utils';
import { type ExternalSongHit, useSongSearch } from '../../lib/queries/songs.queries';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { ListRow } from '../molecules/ListRow';

const DEBOUNCE_MS = 1000;

export type { ExternalSongHit };

export interface SongSearchProps {
  readonly onPick: (hit: ExternalSongHit) => void;
  readonly className?: string;
}

// @FollowsBlueprint organism-query-owning
export function SongSearch({ onPick, className }: SongSearchProps): JSX.Element {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const publishDebouncedQuery = useMemo(
    () => debounce((nextQuery: string) => setDebouncedQuery(nextQuery), DEBOUNCE_MS),
    [],
  );

  const changeQuery = (nextQuery: string): void => {
    setQuery(nextQuery);
    publishDebouncedQuery(nextQuery.trim());
  };

  const search = useSongSearch(debouncedQuery);
  const hits = search.data?.hits ?? [];
  const isLoading = search.isFetching;
  const error =
    search.error instanceof ApiError ? search.error.message : search.error ? 'search-failed' : null;
  const hasSearched = debouncedQuery.length > 0 && !isLoading && error === null;

  return (
    <div className={composeClassName('flex flex-col gap-2', className)}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none">
          <Icon name="search" />
        </span>
        <Input
          type="search"
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          placeholder={t('catalog.searchSong')}
          className="pl-9"
          aria-label={t('catalog.searchSong')}
        />
      </div>
      {isLoading ? <p className="text-meta text-ink-soft italic">{t('common.loading')}</p> : null}
      {error === null ? null : (
        <p className="text-meta text-danger" role="alert">
          {error}
        </p>
      )}
      {hits.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1 rounded-md border border-rule bg-leaf p-1">
          {hits.map((hit) => (
            <li key={hit.deezerTrackId}>
              <SongSearchHitRow hit={hit} onPick={onPick} />
            </li>
          ))}
        </ul>
      ) : null}
      {hasSearched && hits.length === 0 ? (
        <p className="text-meta text-ink-soft italic">{t('catalog.searchNoResults')}</p>
      ) : null}
    </div>
  );
}

interface SongSearchHitRowProps {
  readonly hit: ExternalSongHit;
  readonly onPick: (hit: ExternalSongHit) => void;
}

function SongSearchHitRow({ hit, onPick }: SongSearchHitRowProps): JSX.Element {
  const secondaryParts: string[] = [];
  if (hit.album !== null) secondaryParts.push(hit.album);
  if (hit.durationLabel !== null) secondaryParts.push(hit.durationLabel);
  const secondary = secondaryParts.join(' · ');
  return (
    <ListRow
      onClick={() => onPick(hit)}
      isChevronShown={false}
      className="flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-meta hover:bg-hover"
    >
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <span className="font-medium text-ink">{hit.artist}</span>
          <span className="text-ink-soft"> — </span>
          <span>{hit.title}</span>
          {secondary.length > 0 ? <span className="text-ink-soft"> ({secondary})</span> : null}
        </div>
      </div>
      {hit.titleVersion === null ? null : (
        <div className="text-meta text-ink-soft italic">{hit.titleVersion}</div>
      )}
    </ListRow>
  );
}
