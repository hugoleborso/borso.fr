/**
 * SongSearch — search-as-you-type input that proxies to MusicBrainz
 * via `/api/songs/search` and surfaces clickable result rows. The
 * caller (the New-Song form) is fed `{ title, artist, year }` on
 * pick — manual entry is never blocked.
 *
 * Effect rationale: the molecule uses one `useEffect` to drive a
 * setTimeout-backed debounce. This matches CLAUDE.md's acceptable
 * pattern — synchronising React state with an external timer.
 */

import { useEffect, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ApiError, apiRequest } from '../../lib/api-client';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { cn } from '../atoms/cn.utils';

const DEBOUNCE_MS = 1000;

const externalHitSchema = z.object({
  mbid: z.string(),
  title: z.string(),
  artist: z.string(),
  year: z.number().nullable(),
});
const externalSearchResponseSchema = z.object({ hits: z.array(externalHitSchema) });

export type ExternalSongHit = z.infer<typeof externalHitSchema>;

export interface SongSearchProps {
  readonly onPick: (hit: ExternalSongHit) => void;
  readonly className?: string;
}

export function SongSearch({ onPick, className }: SongSearchProps): JSX.Element {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<ExternalSongHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setHits([]);
      setHasSearched(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      apiRequest(`/api/songs/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((payload) => externalSearchResponseSchema.parse(payload))
        .then((parsed) => {
          setHits(parsed.hits);
          setHasSearched(true);
        })
        .catch((caught: unknown) => {
          if (caught instanceof DOMException && caught.name === 'AbortError') return;
          setError(caught instanceof ApiError ? caught.message : 'search-failed');
        })
        .finally(() => {
          setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

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
      {!loading && hasSearched && hits.length === 0 && error === null ? (
        <p className="text-xs text-ink-500 italic">{t('catalog.searchNoResults')}</p>
      ) : null}
    </div>
  );
}
