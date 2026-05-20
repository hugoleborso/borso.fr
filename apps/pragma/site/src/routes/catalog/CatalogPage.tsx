/**
 * Catalog list page. Renders the editorial catalog from the design
 * bundle:
 *  - Crumb "Répertoire" + serif H1 + dense subtitle,
 *  - SearchBar + FilterPillGroup (status filter with counts),
 *  - CatalogGrid of SongCards (lineup chips, status chip, chart icon).
 *
 * Functional layer untouched: refresh-on-mount, Zod-validated payloads,
 * a "new song" link to /catalog/new.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { FilterPillGroup } from '../../components/molecules/FilterPillGroup';
import { PageHeader } from '../../components/molecules/PageHeader';
import { SearchBar } from '../../components/molecules/SearchBar';
import { CatalogGrid } from '../../components/organisms/CatalogGrid';
import type { SongCardProps } from '../../components/organisms/SongCard';
import { ApiError, apiRequest } from '../../lib/api-client';

const songSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artist: z.string(),
  status: z.enum(['idea', 'wip', 'rehearsed', 'concert_ready']),
  tonalityStart: z.string().nullable(),
  tonalityEnd: z.string().nullable(),
  baseEnergy: z.number().nullable(),
  chordChart: z
    .object({
      kind: z.enum(['chordpro', 'pdf', 'image']),
    })
    .nullable()
    .optional(),
  defaultLineup: z.record(z.string(), z.string().nullable()).default({}),
});
const songListSchema = z.object({ songs: z.array(songSchema) });

const memberSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  color: z.string(),
});
const memberListSchema = z.object({ members: z.array(memberSchema) });

const instrumentSchema = z.object({ id: z.string().uuid(), name: z.string() });
const instrumentListSchema = z.object({ instruments: z.array(instrumentSchema) });

type Song = z.infer<typeof songSchema>;
type Member = z.infer<typeof memberSchema>;
type Instrument = z.infer<typeof instrumentSchema>;

type StatusFilter = 'all' | 'concert_ready' | 'rehearsed' | 'wip' | 'idea';

function countByStatus(songs: readonly Song[], status: StatusFilter): number {
  if (status === 'all') return songs.length;
  return songs.filter((song) => song.status === status).length;
}

function matchesSearch(song: Song, query: string): boolean {
  if (query === '') return true;
  const normalized = query.toLowerCase();
  return (
    song.title.toLowerCase().includes(normalized) ||
    song.artist.toLowerCase().includes(normalized)
  );
}

function compactLineup(
  lineup: Record<string, string | null>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [memberId, instrumentId] of Object.entries(lineup)) {
    if (instrumentId !== null && instrumentId !== '') {
      result[memberId] = instrumentId;
    }
  }
  return result;
}

export function CatalogPage(): JSX.Element {
  const { t } = useTranslation();
  const [songs, setSongs] = useState<Song[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [songsBody, membersBody, instrumentsBody] = await Promise.all([
        apiRequest('/api/songs'),
        apiRequest('/api/members'),
        apiRequest('/api/instruments'),
      ]);
      setSongs(songListSchema.parse(songsBody).songs);
      setMembers(memberListSchema.parse(membersBody).members);
      setInstruments(instrumentListSchema.parse(instrumentsBody).instruments);
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

  const filteredSongs = useMemo(
    () =>
      sortedSongs.filter(
        (song) =>
          (statusFilter === 'all' || song.status === statusFilter) && matchesSearch(song, search),
      ),
    [sortedSongs, statusFilter, search],
  );

  const filterOptions = useMemo(
    () => [
      { value: 'all' as const, label: t('catalog.filterAll'), count: countByStatus(songs, 'all') },
      {
        value: 'concert_ready' as const,
        label: t('catalog.filterConcertReady'),
        count: countByStatus(songs, 'concert_ready'),
      },
      {
        value: 'rehearsed' as const,
        label: t('catalog.filterRehearsed'),
        count: countByStatus(songs, 'rehearsed'),
      },
      {
        value: 'wip' as const,
        label: t('catalog.filterWip'),
        count: countByStatus(songs, 'wip'),
      },
      {
        value: 'idea' as const,
        label: t('catalog.filterIdea'),
        count: countByStatus(songs, 'idea'),
      },
    ],
    [songs, t],
  );

  const lineupMembers = useMemo(
    () =>
      members.map((member) => ({
        id: member.id,
        name: member.firstName,
        color: member.color,
      })),
    [members],
  );

  const cards = useMemo<SongCardProps[]>(
    () =>
      filteredSongs.map((song) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        status: song.status,
        tonalityStart: song.tonalityStart,
        tonalityEnd: song.tonalityEnd,
        chartKind: song.chordChart?.kind ?? null,
        defaultLineup: compactLineup(song.defaultLineup),
        members: lineupMembers,
        instruments,
      })),
    [filteredSongs, lineupMembers, instruments],
  );

  const readyCount = countByStatus(songs, 'concert_ready');
  const subtitle = t('catalog.subtitle', {
    count: songs.length,
    total: songs.length,
    ready: readyCount,
  });

  return (
    <div className="px-9 py-7 pb-20 max-w-[1280px]">
      <PageHeader
        crumb={t('catalog.crumb')}
        title={t('catalog.title')}
        subtitle={subtitle}
        actions={
          <>
            <Button variant="default">
              <Icon name="filter" size={14} />
              {t('common.filters')}
            </Button>
            <Link to="/catalog/new">
              <Button variant="accent" type="button">
                <Icon name="plus" size={14} />
                {t('catalog.newSong')}
              </Button>
            </Link>
          </>
        }
      />

      <div className="flex gap-3.5 items-center mb-5 flex-wrap">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('catalog.searchPlaceholder')}
        />
        <FilterPillGroup options={filterOptions} value={statusFilter} onChange={setStatusFilter} />
      </div>

      {error !== null && (
        <p className="text-danger text-sm mb-4" role="alert">
          {error}
        </p>
      )}
      {loading && <p className="text-ink-400 text-sm italic">{t('common.loading')}</p>}
      {!loading && cards.length === 0 && (
        <p className="text-ink-400 text-sm italic">{t('catalog.emptyList')}</p>
      )}
      {!loading && cards.length > 0 && <CatalogGrid songs={cards} />}
    </div>
  );
}
