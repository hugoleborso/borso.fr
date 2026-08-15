/**
 * Catalog list page. Renders the editorial catalog from the design
 * bundle:
 *  - catalog crumb + serif H1 + dense subtitle,
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
import { useSongsList, useSongThatLostItsLastWrite } from '../../lib/queries/songs';
import {
  buildNewSongPath,
  type CatalogStatusFilter,
  selectCatalogEmptyMessageKey,
  compactLineup,
  countSongsWithStatus,
  selectVisibleSongs,
  sortSongsByTitle,
} from './catalog-page.core';
import { extractChartKind } from './chart-kind.utils';

/**
 * @Blueprint route-list-page
 * @BlueprintName Route List Page
 * @BlueprintUsage Use for a route that reads a collection and renders it as a list or a grid.
 * @BlueprintDescription Calls one query hook per domain it needs, funnels the four errors into a single message and the four loading flags into a single flag, then hands the derivation to `catalog-page.core.ts` so sorting, filtering and counting stay pure and testable. The route owns only the search text and the status filter, and the markup below is one list organism, so the page holds no layout primitive of its own.
 */
export function CatalogPage(): JSX.Element {
  const { t } = useTranslation();
  const songsQuery = useSongsList();
  const membersQuery = useMembersList();
  const instrumentsQuery = useInstrumentsList();
  const masteryQuery = useMasteryDefaults();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CatalogStatusFilter>('all');

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
  const failedWriteSongId = useSongThatLostItsLastWrite();
  // A rolled-back delete puts the row back, so the title is readable again —
  // which is what lets the banner name the song the operator just tried to
  // remove rather than saying "something failed".
  const songThatLostItsWrite = songs.find((song) => song.id === failedWriteSongId)?.title ?? null;
  const members = useMemo(() => membersQuery.data?.members ?? [], [membersQuery.data]);
  const instruments = useMemo(
    () => instrumentsQuery.data?.instruments ?? [],
    [instrumentsQuery.data],
  );
  const masteryDefaults = useMemo(() => masteryQuery.data?.defaults ?? [], [masteryQuery.data]);

  const sortedSongs = useMemo(() => sortSongsByTitle(songs), [songs]);

  const filteredSongs = useMemo(
    () => selectVisibleSongs(sortedSongs, statusFilter, search),
    [sortedSongs, statusFilter, search],
  );

  const filterOptions = useMemo(
    () => [
      {
        value: 'all' as const,
        label: t('catalog.filterAll'),
        count: countSongsWithStatus(songs, 'all'),
      },
      {
        value: 'concert_ready' as const,
        label: t('catalog.filterConcertReady'),
        count: countSongsWithStatus(songs, 'concert_ready'),
      },
      {
        value: 'rehearsed' as const,
        label: t('catalog.filterRehearsed'),
        count: countSongsWithStatus(songs, 'rehearsed'),
      },
      {
        value: 'wip' as const,
        label: t('catalog.filterWip'),
        count: countSongsWithStatus(songs, 'wip'),
      },
      {
        value: 'idea' as const,
        label: t('catalog.filterIdea'),
        count: countSongsWithStatus(songs, 'idea'),
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

  const readyCount = countSongsWithStatus(songs, 'concert_ready');
  const subtitle = t('catalog.subtitle', {
    count: songs.length,
    total: songs.length,
    ready: readyCount,
  });

  const newSongControl = (
    <Link to={buildNewSongPath(search)} className="no-underline self-center justify-self-center">
      <Button variant="accent" type="button">
        <Icon name="plus" size={14} />
        {t('catalog.newSong')}
      </Button>
    </Link>
  );

  return (
    <div className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px]">
      <PageHeader
        crumb={t('catalog.crumb')}
        title={t('catalog.title')}
        subtitle={subtitle}
        actions={newSongControl}
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
      {songThatLostItsWrite !== null && (
        <p
          className="text-danger text-sm mb-4 border border-danger/40 rounded-md px-3 py-2 flex items-center gap-2"
          role="alert"
        >
          <Icon name="warn" size={14} />
          {t('catalog.lastWriteFailed', { title: songThatLostItsWrite })}
        </p>
      )}
      {isLoading && <p className="text-ink-400 text-sm italic">{t('common.loading')}</p>}
      {!isLoading && cards.length === 0 && (
        <div className="flex flex-col items-start gap-3 py-8">
          <p className="text-ink-400 text-sm italic m-0">
            {t(selectCatalogEmptyMessageKey(search))}
          </p>
          <Link to={buildNewSongPath(search)}>
            <Button variant="accent" type="button">
              <Icon name="plus" size={14} />
              {search.trim().length === 0
                ? t('catalog.newSong')
                : t('catalog.createSearched', { title: search.trim() })}
            </Button>
          </Link>
        </div>
      )}
      {!isLoading && cards.length > 0 && <CatalogGrid songs={cards} trailing={newSongControl} />}
    </div>
  );
}
