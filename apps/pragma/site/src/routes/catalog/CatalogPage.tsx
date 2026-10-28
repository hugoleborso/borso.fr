/** @Feature songs */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { BottomActions } from '../../components/atoms/BottomActions';
import { ButtonLink } from '../../components/atoms/ButtonLink';
import { Chip } from '../../components/atoms/Chip';
import { Icon } from '../../components/atoms/Icon';
import { PageHeader } from '../../components/molecules/PageHeader';
import { SearchBar } from '../../components/molecules/SearchBar';
import { StreakBadge } from '../../components/molecules/StreakBadge';
import { CatalogList } from '../../components/organisms/CatalogList';
import type { SongCardProps } from '../../components/organisms/SongCard';
import { ApiError } from '../../lib/api.client';
import { useInstrumentsList } from '../../lib/queries/instruments.queries';
import { useSongsList, useSongThatLostItsLastWrite } from '../../lib/queries/songs.queries';
import { useStudiesOverview } from '../../lib/queries/studies.queries';
import {
  buildCatalogFilterSearch,
  CATALOG_FILTER_PARAMETER,
  CATALOG_FILTERS,
  type CatalogFilter,
  describeSongToLearn,
  parseCatalogFilter,
  selectCatalogEmptyMessageKey,
  selectSongsToLearn,
  selectVisibleSongs,
  sortSongsByTitle,
  TO_LEARN_FILTER,
} from './catalog-page.core';
import { buildAddSongPath } from './add-song.core';
import { extractChartKind } from './chart-kind.utils';

const NO_ROWS: readonly never[] = [];

const PINNED_TOP_CLASS =
  'sticky top-0 z-20 -mx-4 -mt-[calc(1rem+env(safe-area-inset-top))] mb-3 border-b border-rule ' +
  'bg-paper px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 sm:-mx-9 ' +
  'sm:-mt-[calc(1.75rem+env(safe-area-inset-top))] sm:px-9 sm:pt-[calc(1.75rem+env(safe-area-inset-top))]';

const FILTER_LABEL_KEY = {
  all: 'catalog.filterAll',
  learning: 'catalog.filterToLearn',
  concert_ready: 'catalog.filterConcertReady',
  rehearsed: 'catalog.filterRehearsed',
  wip: 'catalog.filterWip',
  idea: 'catalog.filterIdea',
} as const satisfies Readonly<Record<CatalogFilter, string>>;

interface CatalogSongRow {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly status: SongCardProps['status'];
  readonly deezerAlbumId: string | null;
  readonly deezerTrackId: string | null;
  readonly spotifyTrackId: string | null;
  readonly chart: { readonly kind?: unknown } | null;
}

function toSongCard(song: CatalogSongRow, detail: string): SongCardProps {
  return {
    id: song.id,
    title: song.title,
    detail,
    artist: song.artist,
    deezerAlbumId: song.deezerAlbumId,
    deezerTrackId: song.deezerTrackId,
    spotifyTrackId: song.spotifyTrackId,
    status: song.status,
    chartKind: extractChartKind(song.chart),
  };
}

/**
 * @Blueprint route-list-page
 * @BlueprintName Route List Page
 * @BlueprintUsage Use for a route that reads a collection and renders it as a list or a grid.
 * @BlueprintDescription Calls one query hook per domain it needs, funnels their errors into a single message and their loading flags into a single flag, then hands the derivation to `catalog-page.core.ts` so sorting, filtering and the To learn projection stay pure and testable. The route owns only the search text and reads its filter from the address, so coming back from a song keeps it, and the markup below is one list organism, so the page holds no layout primitive of its own.
 */
export function CatalogPage(): JSX.Element {
  const { t } = useTranslation();
  const songsQuery = useSongsList();
  const instrumentsQuery = useInstrumentsList();
  const overviewQuery = useStudiesOverview();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const filter = parseCatalogFilter(searchParams.get(CATALOG_FILTER_PARAMETER));
  const isToLearn = filter === TO_LEARN_FILTER;

  const firstError = songsQuery.error ?? instrumentsQuery.error;
  const errorMessage =
    firstError instanceof ApiError ? firstError.message : firstError ? 'unknown-error' : null;
  const isLoading = songsQuery.isLoading || instrumentsQuery.isLoading;

  const songs = useMemo(() => songsQuery.data?.songs ?? NO_ROWS, [songsQuery.data]);
  const failedWriteSongId = useSongThatLostItsLastWrite();
  const titleOfSongThatLostItsWrite =
    songs.find((song) => song.id === failedWriteSongId)?.title ?? null;
  const instrumentNames = useMemo(
    () =>
      new Map(
        (instrumentsQuery.data?.instruments ?? NO_ROWS).map((instrument) => [
          instrument.id,
          instrument.name,
        ]),
      ),
    [instrumentsQuery.data],
  );
  const queue = overviewQuery.data?.queue ?? NO_ROWS;

  const cards = useMemo<SongCardProps[]>(() => {
    if (isToLearn) {
      return selectSongsToLearn(songs, queue, search).map((entry) =>
        toSongCard(entry.song, describeSongToLearn(entry, instrumentNames)),
      );
    }
    return selectVisibleSongs(sortSongsByTitle(songs), filter, search).map((song) =>
      toSongCard(song, song.artist),
    );
  }, [isToLearn, songs, queue, search, instrumentNames, filter]);

  const chooseFilter = (next: CatalogFilter): void => {
    setSearchParams(buildCatalogFilterSearch(next), { replace: true });
  };

  return (
    <div className="max-w-3xl px-4 py-4 sm:px-9 sm:py-7">
      <div data-pinned-top className={PINNED_TOP_CLASS}>
        <PageHeader
          className="mb-2 sm:mb-3"
          title={t('catalog.title')}
          inline={
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={t('catalog.searchPlaceholder')}
            />
          }
        />

        <div
          role="group"
          aria-label={t('catalog.filterLabel')}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {CATALOG_FILTERS.map((option) => (
            <Chip
              key={option}
              pressed={option === filter}
              onPress={() => chooseFilter(option)}
              className="shrink-0"
            >
              {t(FILTER_LABEL_KEY[option])}
            </Chip>
          ))}
        </div>
      </div>

      {isToLearn && overviewQuery.data !== undefined ? (
        <div className="mb-3">
          <StreakBadge {...overviewQuery.data.myStreak} />
        </div>
      ) : null}

      {errorMessage !== null && (
        <p className="text-danger text-meta mb-4" role="alert">
          {errorMessage}
        </p>
      )}
      {titleOfSongThatLostItsWrite !== null && (
        <p
          className="text-danger text-meta mb-4 border border-danger/40 rounded-md px-3 py-2 flex items-center gap-2"
          role="alert"
        >
          <Icon name="warn" size="sm" />
          {t('catalog.lastWriteFailed', { title: titleOfSongThatLostItsWrite })}
        </p>
      )}
      {isLoading && <p className="text-ink-soft text-meta italic">{t('common.loading')}</p>}
      {!isLoading && cards.length === 0 && (
        <p className="m-0 py-8 text-meta text-ink-soft italic">
          {t(selectCatalogEmptyMessageKey(search, filter))}
        </p>
      )}
      {!isLoading && cards.length > 0 && <CatalogList songs={cards} />}
      <BottomActions>
        <ButtonLink variant="primary" size="lg" icon="plus" to={buildAddSongPath(search)}>
          {t('catalog.addSong')}
        </ButtonLink>
      </BottomActions>
    </div>
  );
}
