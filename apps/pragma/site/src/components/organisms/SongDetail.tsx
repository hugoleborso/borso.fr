/** @Feature songs */

import { type JSX, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type SongRecord,
  useLastSongWriteFailure,
  useUpdateSong,
} from '../../lib/queries/songs.queries';
import type {
  LineupInstrument,
  LineupMember,
  SongLineupRow,
} from '../../routes/catalog/song-lineup.core';
import { Icon } from '../atoms/Icon';
import { DeezerTrackTakenNotice } from '../molecules/DeezerTrackTakenNotice';
import { BackLink } from '../molecules/BackLink';
import { LineupEditor, type LineupRecord } from '../molecules/LineupEditor';
import { toLineupPayload } from '../molecules/lineup-editor.core';
import { MasteryProgressChart } from './MasteryProgressChart';
import { SongChartPreviews } from './SongChartPreviews';
import { SongDetailHeader } from './SongDetailHeader';
import { SongDetailSidebar } from './SongDetailSidebar';
import { SongLinksCard } from './SongLinksCard';
import { SongNotesCard } from './SongNotesCard';
import { SongTakes } from './SongTakes';

export interface SongDetailProps {
  readonly song: SongRecord;
  readonly members: readonly LineupMember[];
  readonly instruments: readonly LineupInstrument[];
  readonly lineupRows: readonly SongLineupRow[];
  readonly hasSideLoadFailed: boolean;
  readonly selectedTakeId: string | null;
  readonly onSelectTake: (takeId: string | null) => void;
}

// @FollowsBlueprint organism-query-owning
export function SongDetail(props: SongDetailProps): JSX.Element {
  const { song, members, instruments } = props;
  const { t } = useTranslation();
  const updateSong = useUpdateSong();
  const lastWriteFailure = useLastSongWriteFailure(song.id);
  const [lineupEditorOpen, setLineupEditorOpen] = useState<boolean>(false);

  const lineupEditorMembers = useMemo(
    () => members.map((member) => ({ id: member.id, name: member.firstName, color: member.color })),
    [members],
  );
  const lineupEditorInstruments = useMemo(
    () => instruments.map((instrument) => ({ id: instrument.id, name: instrument.name })),
    [instruments],
  );

  const saveSongLineup = (lineup: LineupRecord | null): void => {
    updateSong.mutate({ id: song.id, defaultLineup: toLineupPayload(lineup) });
  };

  return (
    <section className="px-4 sm:px-9 py-4 sm:py-7 pb-20 max-w-[1280px] flex flex-col gap-5">
      <BackLink to="/catalog" label={t('catalog.backToCatalog')} />

      <SongDetailHeader song={song} />

      {props.hasSideLoadFailed ? (
        <p className="text-danger text-meta" role="alert">
          {t('common.loadFailed')}
        </p>
      ) : null}

      {lastWriteFailure.takenTrack === null ? null : (
        <DeezerTrackTakenNotice takenTrack={lastWriteFailure.takenTrack} />
      )}

      {lastWriteFailure.isGenericFailureShown ? (
        <p
          className="text-danger text-meta border border-danger/40 rounded-md px-3 py-2 flex items-center gap-2"
          role="alert"
        >
          <Icon name="warn" size="sm" />
          {t('catalog.lastSaveFailed')}
        </p>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <SongChartPreviews songId={song.id} chart={song.chart} />

          <SongTakes
            songId={song.id}
            songTitle={song.title}
            selectedTakeId={props.selectedTakeId}
            onSelectTake={props.onSelectTake}
          />

          <SongNotesCard song={song} />

          <SongLinksCard links={song.links} />
        </div>

        <SongDetailSidebar
          lineupRows={props.lineupRows}
          baseEnergy={song.baseEnergy}
          onEditDefaultLineup={() => setLineupEditorOpen(true)}
        />
      </div>
      <MasteryProgressChart songId={song.id} members={members} instruments={instruments} />
      <LineupEditor
        open={lineupEditorOpen}
        surface="song"
        members={lineupEditorMembers}
        instruments={lineupEditorInstruments}
        currentLineup={song.defaultLineup}
        onSave={(lineup) => saveSongLineup(lineup)}
        onClose={() => setLineupEditorOpen(false)}
      />
    </section>
  );
}
