/**
 * Catalog list page. Renders songs as cards (title + artist + status
 * badge) and links to the per-song detail page. A "new song" button
 * opens the song create form on the detail route with no id.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { ApiError, apiRequest } from '../../lib/api-client';

const songSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artist: z.string(),
  status: z.string(),
  tonalityStart: z.string().nullable(),
  tonalityEnd: z.string().nullable(),
  baseEnergy: z.number().nullable(),
});
const listSchema = z.object({ songs: z.array(songSchema) });

type Song = z.infer<typeof songSchema>;

function statusKey(status: string): string {
  if (status === 'idea') return 'catalog.statusIdea';
  if (status === 'wip') return 'catalog.statusWip';
  if (status === 'rehearsed') return 'catalog.statusRehearsed';
  return 'catalog.statusConcertReady';
}

export function CatalogPage(): JSX.Element {
  const { t } = useTranslation();
  const [songs, setSongs] = useState<Song[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const body = listSchema.parse(await apiRequest('/api/songs'));
      setSongs(body.songs);
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
        {sortedSongs.map((song) => (
          <li key={song.id} className="catalog-card">
            <Link to={`/catalog/${song.id}`} className="catalog-card-link">
              <h3 className="catalog-card-title">{song.title}</h3>
              <p className="catalog-card-artist">{song.artist}</p>
              <span className="catalog-card-status">{t(statusKey(song.status))}</span>
              {song.tonalityStart !== null ? (
                <span className="catalog-card-tonality">{song.tonalityStart}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
