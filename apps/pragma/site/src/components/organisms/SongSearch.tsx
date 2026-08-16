/**
 * SongSearch — search-as-you-type input that proxies to MusicBrainz
 * via `useSongSearch()` (TanStack Query). The caller (the New-Song
 * form) is fed the full `ExternalSongHit` on pick — title + artist
 * pre-fill the form, the album / duration / tags / isrcs / mbid /
 * disambiguation rows ride along for the persisted song record.
 *
 * The 1000ms debounce runs in the change handler, through the shared
 * `debounce` primitive, so the network call fires once per typing
 * pause and no effect watches the input value.
 * @Feature songs
 */

import { type JSX, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api.client';
import { debounce } from '../../lib/debounce.utils';
import { useSongSearch } from '../../lib/queries/songs.queries';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';

const DEBOUNCE_MS = 1000;
const TAGS_DISPLAYED_MAX = 3;

export interface ExternalSongHit {
  readonly mbid: string;
  readonly title: string;
  readonly artist: string;
  readonly year: number | null;
  readonly album: string | null;
  readonly releaseId: string | null;
  readonly durationSeconds: number | null;
  readonly durationLabel: string | null;
  readonly disambiguation: string | null;
  readonly tags: readonly string[];
  readonly isrcs: readonly string[];
}

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
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
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
      <p className="text-xs text-ink-400">{t('catalog.searchSongHint')}</p>
      {isLoading ? <p className="text-xs text-ink-500 italic">{t('common.loading')}</p> : null}
      {error === null ? null : (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      {hits.length > 0 ? (
        <ul className="flex flex-col gap-1 border border-line rounded-md p-1 bg-bg-elev max-h-72 overflow-y-auto">
          {hits.map((hit) => (
            <li key={hit.mbid}>
              <SongSearchHitRow hit={hit} onPick={onPick} />
            </li>
          ))}
        </ul>
      ) : null}
      {hasSearched && hits.length === 0 ? (
        <p className="text-xs text-ink-500 italic">{t('catalog.searchNoResults')}</p>
      ) : null}
    </div>
  );
}

interface SongSearchHitRowProps {
  readonly hit: ExternalSongHit;
  readonly onPick: (hit: ExternalSongHit) => void;
}

function SongSearchHitRow({ hit, onPick }: SongSearchHitRowProps): JSX.Element {
  const visibleTags = hit.tags.slice(0, TAGS_DISPLAYED_MAX);
  const secondaryParts: string[] = [];
  if (hit.year !== null) secondaryParts.push(String(hit.year));
  if (hit.album !== null) secondaryParts.push(hit.album);
  if (hit.durationLabel !== null) secondaryParts.push(hit.durationLabel);
  const secondary = secondaryParts.join(' · ');
  return (
    <button
      type="button"
      onClick={() => onPick(hit)}
      className="w-full text-left px-2 py-1.5 rounded text-sm text-ink-700 hover:bg-bg cursor-pointer flex flex-col gap-0.5"
    >
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <span className="font-medium text-ink-900">{hit.artist}</span>
          <span className="text-ink-500"> — </span>
          <span>{hit.title}</span>
          {secondary.length > 0 ? <span className="text-ink-400"> ({secondary})</span> : null}
        </div>
        {visibleTags.length > 0 ? (
          <div className="flex gap-1 flex-wrap shrink-0">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 rounded bg-bg border border-line text-ink-500 uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {hit.disambiguation === null ? null : (
        <div className="text-xs text-ink-400 italic">{hit.disambiguation}</div>
      )}
    </button>
  );
}
