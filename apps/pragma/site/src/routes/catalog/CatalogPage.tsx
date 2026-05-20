/**
 * Catalog list page. Renders songs as cards (title + artist + status
 * badge + energy badge + mastery aggregate) and links to the per-song
 * detail page. A "new song" button opens the song create form on the
 * detail route with no id.
 *
 * Energy badge: shows the song's baseEnergy if any, coloured per the
 * design bundle's energy palette. Mastery aggregate: mean
 * `effective(member, defaultLineup[member])` across the song's lineup —
 * computed front-side via a thin port of `mastery.core.ts`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { ApiError, apiRequest } from '../../lib/api-client';
import { meanMasteryForSong } from '../../lib/mastery-aggregate.utils';

const songSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artist: z.string(),
  status: z.string(),
  tonalityStart: z.string().nullable(),
  tonalityEnd: z.string().nullable(),
  baseEnergy: z.number().nullable(),
  defaultLineup: z.record(z.string(), z.string().nullable()).default({}),
});
const songListSchema = z.object({ songs: z.array(songSchema) });

const masteryDefaultSchema = z.object({
  memberId: z.string().uuid(),
  instrumentId: z.string().uuid(),
  score: z.number(),
});
const masteryDefaultListSchema = z.object({ defaults: z.array(masteryDefaultSchema) });

type Song = z.infer<typeof songSchema>;
type MasteryDefault = z.infer<typeof masteryDefaultSchema>;

function statusKey(status: string): string {
  if (status === 'idea') return 'catalog.statusIdea';
  if (status === 'wip') return 'catalog.statusWip';
  if (status === 'rehearsed') return 'catalog.statusRehearsed';
  return 'catalog.statusConcertReady';
}

function energyClassName(baseEnergy: number | null): string {
  if (baseEnergy === null) return 'catalog-card-energy catalog-card-energy--none';
  if (baseEnergy <= 3) return 'catalog-card-energy catalog-card-energy--low';
  if (baseEnergy <= 7) return 'catalog-card-energy catalog-card-energy--mid';
  return 'catalog-card-energy catalog-card-energy--high';
}

export function CatalogPage(): JSX.Element {
  const { t } = useTranslation();
  const [songs, setSongs] = useState<Song[]>([]);
  const [defaults, setDefaults] = useState<MasteryDefault[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [songsBody, masteryBody] = await Promise.all([
        apiRequest('/api/songs'),
        apiRequest('/api/mastery/defaults'),
      ]);
      setSongs(songListSchema.parse(songsBody).songs);
      setDefaults(masteryDefaultListSchema.parse(masteryBody).defaults);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sortedSongs = useMemo(
    () => songs.toSorted((left, right) => left.title.localeCompare(right.title)),
    [songs],
  );

  return (
    <section className="catalog-page">
      <header className="catalog-page-header">
        <h2 className="admin-page-title">{t('catalog.title')}</h2>
        <Link className="admin-page-form-submit" to="/catalog/new">
          {t('catalog.newSong')}
        </Link>
      </header>
      {error !== null ? <p className="admin-page-error">{error}</p> : null}
      {loading ? <p className="admin-page-loading">{t('common.loading')}</p> : null}
      {!loading && sortedSongs.length === 0 ? (
        <p className="admin-page-loading">{t('catalog.emptyList')}</p>
      ) : null}
      <ul className="catalog-list">
        {sortedSongs.map((song) => {
          const mastery = meanMasteryForSong(song.defaultLineup, defaults);
          return (
            <li key={song.id} className="catalog-card">
              <Link to={`/catalog/${song.id}`} className="catalog-card-link">
                <h3 className="catalog-card-title">{song.title}</h3>
                <p className="catalog-card-artist">{song.artist}</p>
                <span className="catalog-card-status">{t(statusKey(song.status))}</span>
                {song.tonalityStart !== null ? (
                  <span className="catalog-card-tonality">{song.tonalityStart}</span>
                ) : null}
                <span className={energyClassName(song.baseEnergy)}>
                  {t('catalog.energyBadge')}{' '}
                  {song.baseEnergy === null ? t('catalog.noMastery') : song.baseEnergy}
                </span>
                <span className="catalog-card-mastery">
                  {t('catalog.masteryBadge')}{' '}
                  {mastery === null ? t('catalog.noMastery') : mastery.toFixed(1)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
