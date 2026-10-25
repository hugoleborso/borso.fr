/** @Feature songs */

import type { JSX } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { SongDetail } from '../../components/organisms/SongDetail';
import { useInstrumentsList } from '../../lib/queries/instruments.queries';
import { useMasteryDefaults } from '../../lib/queries/mastery.queries';
import { useMasteryOverridesOfSong } from '../../lib/queries/studies.queries';
import { useMembersList } from '../../lib/queries/members.queries';
import { useSong } from '../../lib/queries/songs.queries';
import { selectMissingSongMessageKey } from './missing-song.core';
import { buildEffectiveMasteryLookup, buildSongLineupRows } from './song-lineup.core';
import { useTakeSelection } from './take-selection.hook';

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint route-detail-page
export function SongDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const { songId } = useParams<{ songId: string }>();
  const songQuery = useSong(songId ?? '', songId !== undefined);
  const membersQuery = useMembersList();
  const instrumentsQuery = useInstrumentsList();
  const masteryQuery = useMasteryDefaults();
  const songOverridesQuery = useMasteryOverridesOfSong(songId ?? '', songId !== undefined);
  const { selectedTakeId, selectTake } = useTakeSelection();

  const song = songQuery.data?.song ?? null;
  const members = useMemo(() => membersQuery.data?.members ?? NO_ROWS, [membersQuery.data]);
  const instruments = useMemo(
    () => instrumentsQuery.data?.instruments ?? NO_ROWS,
    [instrumentsQuery.data],
  );
  const masteryDefaults = useMemo(
    () => masteryQuery.data?.defaults ?? NO_ROWS,
    [masteryQuery.data],
  );
  const isLoading =
    songQuery.isLoading ||
    membersQuery.isLoading ||
    instrumentsQuery.isLoading ||
    masteryQuery.isLoading;
  const hasSideLoadFailed =
    (membersQuery.error ?? instrumentsQuery.error ?? masteryQuery.error) !== null;

  const songOverrides = useMemo(
    () => songOverridesQuery.data?.overrides ?? NO_ROWS,
    [songOverridesQuery.data],
  );
  const masteryLookup = useMemo(
    () => buildEffectiveMasteryLookup(masteryDefaults, songOverrides),
    [masteryDefaults, songOverrides],
  );
  const lineupRows = useMemo(
    () => buildSongLineupRows(song?.defaultLineup ?? {}, members, instruments, masteryLookup),
    [song, members, instruments, masteryLookup],
  );

  if (isLoading) {
    return (
      <p className="px-4 sm:px-9 py-4 sm:py-7 text-ink-400 italic text-sm">{t('common.loading')}</p>
    );
  }
  if (song === null) {
    return (
      <NotFoundNotice
        message={t(selectMissingSongMessageKey(songQuery.error))}
        backTo="/catalog"
        backLabel={t('catalog.backToCatalog')}
      />
    );
  }

  return (
    <SongDetail
      song={song}
      members={members}
      instruments={instruments}
      lineupRows={lineupRows}
      hasSideLoadFailed={hasSideLoadFailed}
      selectedTakeId={selectedTakeId}
      onSelectTake={selectTake}
    />
  );
}
