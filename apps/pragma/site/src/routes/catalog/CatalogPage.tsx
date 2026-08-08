/**
 * Catalog list page. Renders the editorial catalog from the design
 * bundle:
 *  - Crumb "Répertoire" + serif H1 + dense subtitle,
 *  - SearchBar + FilterPillGroup (status filter with counts),
 *  - CatalogGrid of SongCards (lineup chips, status chip, chart icon).
 *
 * Data goes through TanStack Query — songs, members, instruments and
 * mastery defaults each have their own cache key, so navigating away
 * and back hits a warm cache and the page renders synchronously.
 */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { FilterPillGroup } from '../../components/molecules/FilterPillGroup';
import { PageHeader } from '../../components/molecules/PageHeader';
import { SearchBar } from '../../components/molecules/SearchBar';
import { CatalogGrid } from '../../components/organisms/CatalogGrid';
import type { SongCardProps } from '../../components/organisms/SongCard';
import { ApiError } from '../../lib/api';
import { meanMasteryForSong } from '../../lib/mastery-aggregate.utils';
import { useInstrumentsList } from '../../lib/queries/instruments';
import { useMasteryDefaults } from '../../lib/queries/mastery';
import { useMembersList } from '../../lib/queries/members';
import { useSongsList } from '../../lib/queries/songs';
import { extractChartKind } from './chart-kind.utils';

type Song = NonNullable<ReturnType<typeof useSongsList>['data']>['songs'][number];

type StatusFilter = 'all' | 'concert_ready' | 'rehearsed' | 'wip' | 'idea';

function countByStatus(songs: readonly Song[], status: StatusFilter): number {
  if (status === 'all') return songs.length;
  return songs.filter((song) => song.status === status).length;
}

function matchesSearch(song: Song, query: string): boolean {
  if (query === '') return true;
  const normalized = query.toLowerCase();
  return (
    song.title.toLowerCase().includes(normalized) || song.artist.toLowerCase().includes(normalized)
  );
}

function compactLineup(lineup: Record<string, string | null>): Record<string, string> {
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
  const songsQuery = useSongsList();
  const membersQuery = useMembersList();
  const instrumentsQuery = useInstrumentsList();
  const masteryQuery = useMasteryDefaults();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const firstError =
    songsQuery.error ?? membersQuery.error ?? instrumentsQuery.error ?? masteryQuery.error;
  const errorMessage =
    firstError instanceof ApiError ? firstError.message : firstError ? 'unknown-error' : null;
  const isLoading =
    songsQuery.isLoading ||
    membersQuery.isLoading ||
    instrumentsQuery.isLoading ||
    masteryQuery.isLoading;

  const songs = useMemo(() => songsQuery.data?.songs ?? [], [songsQuery.data]);
  const members = useMemo(() => membersQuery.data?.members ?? [], [membersQuery.data]);
  const instruments = useMemo(
    () => instrumentsQuery.data?.instruments ?? [],
    [instrumentsQuery.data],
  );
  const masteryDefaults = useMemo(() => masteryQuery.data?.defaults ?? [], [masteryQuery.data]);

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
        chartKind: extractChartKind(song.chart ?? null),
        baseEnergy: song.baseEnergy,
        meanMastery: meanMasteryForSong(song.defaultLineup, masteryDefaults),
        defaultLineup: compactLineup(song.defaultLineup),
        members: lineupMembers,
        instruments,
      })),
    [filteredSongs, lineupMembers, instruments, masteryDefaults],
  );

  const readyCount = countByStatus(songs, 'concert_ready');
  const subtitle = t('catalog.subtitle', {
    count: songs.length,
    total: songs.length,
    ready: readyCount,
  });

  return (
    <div className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px]">
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

      {errorMessage !== null && (
        <p className="text-danger text-sm mb-4" role="alert">
          {errorMessage}
        </p>
      )}
      {isLoading && <p className="text-ink-400 text-sm italic">{t('common.loading')}</p>}
      {!isLoading && cards.length === 0 && (
        <p className="text-ink-400 text-sm italic">{t('catalog.emptyList')}</p>
      )}
      {!isLoading && cards.length > 0 && <CatalogGrid songs={cards} />}
    </div>
  );
}
