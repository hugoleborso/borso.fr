/**
 * SongSearch — search-as-you-type input that proxies to MusicBrainz
 * via `useSongSearch()` (TanStack Query). The caller (the New-Song
 * form) is fed `{ title, artist, year }` on pick — manual entry is
 * never blocked.
 *
 * The 1000ms debounce sits on the input via a `setTimeout` that
 * forwards the trimmed query to `searchQuery` state — `useSongSearch`
 * receives the debounced value, so the network call only fires once
 * per typing pause. The debounce effect synchronises React state with
 * an external timer; that's the canonical `useEffect` carve-out from
 * CLAUDE.md.
 */

import { useEffect, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api';
import { useSongSearch } from '../../lib/queries/songs';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { cn } from '../atoms/cn.utils';

const DEBOUNCE_MS = 1000;

export interface ExternalSongHit {
  readonly mbid: string;
  readonly title: string;
  readonly artist: string;
  readonly year: number | null;
}

export interface SongSearchProps {
  readonly onPick: (hit: ExternalSongHit) => void;
  readonly className?: string;
}

export function SongSearch({ onPick, className }: SongSearchProps): JSX.Element {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const search = useSongSearch(debouncedQuery);
  const hits = search.data?.hits ?? [];
  const loading = search.isFetching;
  const error =
    search.error instanceof ApiError
      ? search.error.message
      : search.error
        ? 'search-failed'
        : null;
  const hasSearched = debouncedQuery.length > 0 && !loading && error === null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
          <Icon name="search" />
        </span>
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('catalog.searchSong')}
          className="pl-9"
          aria-label={t('catalog.searchSong')}
        />
      </div>
      <p className="text-xs text-ink-400">{t('catalog.searchSongHint')}</p>
      {loading ? (
        <p className="text-xs text-ink-500 italic">{t('common.loading')}</p>
      ) : null}
      {error !== null ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {hits.length > 0 ? (
        <ul className="flex flex-col gap-1 border border-line rounded-md p-1 bg-bg-elev max-h-64 overflow-y-auto">
          {hits.map((hit) => (
            <li key={hit.mbid}>
              <button
                type="button"
                onClick={() => onPick(hit)}
                className="w-full text-left px-2 py-1.5 rounded text-sm text-ink-700 hover:bg-bg cursor-pointer"
              >
                <span className="font-medium text-ink-900">{hit.artist}</span>
                <span className="text-ink-500"> — </span>
                <span>{hit.title}</span>
                {hit.year !== null ? (
                  <span className="text-ink-400"> ({hit.year})</span>
                ) : null}
              </button>
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
