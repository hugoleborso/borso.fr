/** @Feature songs */

import { type JSX, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { selectSongListenLinks } from '../../lib/listen-links.utils';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { useSetlistsList } from '../../lib/queries/setlists.queries';
import {
  type SongRecord,
  useLastSongWriteFailure,
  useUpdateSong,
} from '../../lib/queries/songs.queries';
import { describeSetlistsOfSong, selectMemberLineupRow } from '../../routes/catalog/song-page.core';
import type {
  LineupInstrument,
  LineupMember,
  SongLineupRow,
} from '../../routes/catalog/song-lineup.core';
import { BottomActions } from '../atoms/BottomActions';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { BackLink } from '../molecules/BackLink';
import { DeezerTrackTakenNotice } from '../molecules/DeezerTrackTakenNotice';
import { LineupEditor, type LineupRecord } from '../molecules/LineupEditor';
import { toLineupPayload } from '../molecules/lineup-editor.core';
import { ListenRow } from '../molecules/ListenRow';
import { MasteryProgressChart } from './MasteryProgressChart';
import { RecordingSheetDialogs } from './RecordingSheet';
import { useRecordingSheet } from './recording-sheet.hook';
import { SongChartPreviews } from './SongChartPreviews';
import { SongDetailHeader } from './SongDetailHeader';
import { SongDetailSidebar } from './SongDetailSidebar';
import { SongLinksCard } from './SongLinksCard';
import { SongNotesCard } from './SongNotesCard';
import { SongRoundActions } from './SongRoundActions';
import { SongTakes } from './SongTakes';
import { SongYourPart } from './SongYourPart';

export interface SongDetailProps {
  readonly song: SongRecord;
  readonly members: readonly LineupMember[];
  readonly instruments: readonly LineupInstrument[];
  readonly lineupRows: readonly SongLineupRow[];
  readonly hasSideLoadFailed: boolean;
  readonly selectedTakeId: string | null;
  readonly onSelectTake: (takeId: string | null) => void;
}

const NOTES_ANCHOR = 'song-notes';
const NO_SETLISTS: readonly never[] = [];

// @FollowsBlueprint organism-query-owning
export function SongDetail(props: SongDetailProps): JSX.Element {
  const { song, members, instruments } = props;
  const { t } = useTranslation();
  const updateSong = useUpdateSong();
  const lastWriteFailure = useLastSongWriteFailure(song.id);
  const memberQuery = useSignedInMember();
  const setlistsQuery = useSetlistsList();
  const recording = useRecordingSheet();
  const [lineupEditorOpen, setLineupEditorOpen] = useState<boolean>(false);

  const lineupEditorMembers = useMemo(
    () => members.map((member) => ({ id: member.id, name: member.firstName, color: member.color })),
    [members],
  );
  const lineupEditorInstruments = useMemo(
    () => instruments.map((instrument) => ({ id: instrument.id, name: instrument.name })),
    [instruments],
  );
  const listenLinks = useMemo(() => selectSongListenLinks(song), [song]);
  const setlistsLine = describeSetlistsOfSong(setlistsQuery.data?.setlists ?? NO_SETLISTS, song.id);
  const memberRow = selectMemberLineupRow(props.lineupRows, memberQuery.data?.memberId ?? null);

  const saveSongLineup = (lineup: LineupRecord | null): void => {
    updateSong.mutate({ id: song.id, defaultLineup: toLineupPayload(lineup) });
  };

  return (
    <section className="flex max-w-3xl flex-col gap-5 px-4 py-4 sm:px-9 sm:py-7">
      <BackLink to="/catalog" label={t('catalog.title')} />

      <SongDetailHeader
        song={song}
        menuItems={[
          {
            label: t('catalog.editLineup'),
            icon: 'members',
            tone: 'default',
            onSelect: () => setLineupEditorOpen(true),
          },
        ]}
      />

      <ListenRow links={listenLinks} />

      <p className="m-0 flex items-center gap-2 text-meta text-ink-soft">
        <Icon name="setlist" size="sm" />
        {t(setlistsLine.messageKey, { names: setlistsLine.names })}
      </p>

      <SongRoundActions
        songId={song.id}
        defaultLineup={song.defaultLineup}
        notesAnchor={NOTES_ANCHOR}
      />

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

      <SongYourPart row={memberRow} />

      <SongChartPreviews chart={song.chart} />

      <SongTakes
        songId={song.id}
        songTitle={song.title}
        selectedTakeId={props.selectedTakeId}
        onSelectTake={props.onSelectTake}
      />

      <SongDetailSidebar lineupRows={props.lineupRows} baseEnergy={song.baseEnergy} />

      <div id={NOTES_ANCHOR} className="scroll-mt-4">
        <SongNotesCard song={song} />
      </div>

      <SongLinksCard links={song.links} />

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
      <RecordingSheetDialogs controller={recording} />
      <BottomActions>
        <Button
          variant="primary"
          size="lg"
          icon="mic"
          disabled={recording.view.isOpen}
          onClick={() =>
            void recording.start({ songId: song.id, songTitle: song.title, sessionId: null })
          }
        >
          {t('catalog.recordTake')}
        </Button>
      </BottomActions>
    </section>
  );
}
