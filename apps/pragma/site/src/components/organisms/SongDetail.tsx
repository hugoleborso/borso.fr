/** @Feature songs */

import { type JSX, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { isDeviceIos } from '../../lib/display-mode.adapter';
import { selectSongListenLinks } from '../../lib/listen-links.utils';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { useSetlistsList } from '../../lib/queries/setlists.queries';
import {
  type SongRecord,
  useLastSongWriteFailure,
  useSongPreview,
  useUpdateSong,
} from '../../lib/queries/songs.queries';
import { useTakesOfSong } from '../../lib/queries/takes.queries';
import { selectHeldInstrumentIds } from '../../routes/catalog/opening-chart.core';
import { describeSetlistsOfSong } from '../../routes/catalog/song-page.core';
import type {
  LineupInstrument,
  LineupMember,
  SongLineupRow,
} from '../../routes/catalog/song-lineup.core';
import { SONG_PAGE_TABS, type SongPageTab } from '../../routes/catalog/song-view-tab.core';
import { BottomActions } from '../atoms/BottomActions';
import { Button } from '../atoms/Button';
import { ButtonLink } from '../atoms/ButtonLink';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { DeezerTrackTakenNotice } from '../molecules/DeezerTrackTakenNotice';
import { LineupEditor, type LineupRecord } from '../molecules/LineupEditor';
import { toLineupPayload } from '../molecules/lineup-editor.core';
import { ListenRow } from '../molecules/ListenRow';
import { SongEnergyField } from '../molecules/SongEnergyField';
import { SongLineupChips } from '../molecules/SongLineupChips';
import { SongViewTabs } from '../molecules/SongViewTabs';
import { RecordingSheetDialogs } from './RecordingSheet';
import { useRecordingSheet } from './recording-sheet.hook';
import { SongChartPreviews } from './SongChartPreviews';
import { SongDetailHeader } from './SongDetailHeader';
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
  readonly tab: SongPageTab;
  readonly onTabChange: (tab: SongPageTab) => void;
  readonly compositionId: string | null;
}

const NO_SETLISTS: readonly never[] = [];
const ENERGY_LABEL_CLASS =
  'm-0 shrink-0 whitespace-nowrap text-label tracking-wider uppercase text-ink-soft font-medium';

// @FollowsBlueprint organism-query-owning
export function SongDetail(props: SongDetailProps): JSX.Element {
  const { song, members, instruments } = props;
  const { t } = useTranslation();
  const updateSong = useUpdateSong();
  const lastWriteFailure = useLastSongWriteFailure(song.id);
  const setlistsQuery = useSetlistsList();
  const previewQuery = useSongPreview(song.id, song.deezerTrackId !== null);
  const takesQuery = useTakesOfSong(song.id);
  const recording = useRecordingSheet();
  const signedInMember = useSignedInMember();
  const [lineupEditorOpen, setLineupEditorOpen] = useState<boolean>(false);

  const lineupEditorMembers = useMemo(
    () => members.map((member) => ({ id: member.id, name: member.firstName, color: member.color })),
    [members],
  );
  const lineupEditorInstruments = useMemo(
    () => instruments.map((instrument) => ({ id: instrument.id, name: instrument.name })),
    [instruments],
  );
  const listenLinks = useMemo(() => selectSongListenLinks(song, { isIos: isDeviceIos() }), [song]);
  const setlistsLine = describeSetlistsOfSong(setlistsQuery.data?.setlists ?? NO_SETLISTS, song.id);

  const saveSongLineup = (lineup: LineupRecord | null): void => {
    updateSong.mutate({ id: song.id, defaultLineup: toLineupPayload(lineup) });
  };

  return (
    <section className="flex max-w-3xl flex-col gap-5 px-4 py-4 sm:px-9 sm:py-7">
      <SongDetailHeader song={song} previewUrl={previewQuery.data?.previewUrl ?? null} />

      <ListenRow links={listenLinks} />

      <SongViewTabs
        tabs={SONG_PAGE_TABS}
        value={props.tab}
        takeCount={takesQuery.data?.takes.length ?? null}
        onChange={props.onTabChange}
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

      <div role="tabpanel" className="flex flex-col gap-5">
        {
          {
            info: (
              <>
                <SongNotesCard song={song} />
                <Card
                  variant="flat"
                  className="flex items-center gap-3 bg-sunk border-0 py-1 sm:py-1"
                >
                  <h2 className={ENERGY_LABEL_CLASS}>{t('catalog.baseEnergy')}</h2>
                  <SongEnergyField
                    baseEnergy={song.baseEnergy}
                    size="wide"
                    onChange={(level) => updateSong.mutate({ id: song.id, baseEnergy: level })}
                  />
                </Card>
                <SongLineupChips rows={props.lineupRows} onEdit={() => setLineupEditorOpen(true)} />
                <p className="m-0 flex items-center gap-2 text-meta text-ink-soft">
                  <Icon name="setlist" size="sm" />
                  {t(setlistsLine.messageKey, { names: setlistsLine.names })}
                </p>
                <SongLinksCard links={song.links} />
                {props.compositionId === null ? null : (
                  <Link
                    to={`/compos/${props.compositionId}/sketch`}
                    className="inline-flex min-h-11 items-center gap-2 self-start text-meta text-accent"
                  >
                    <Icon name="compos" size="sm" />
                    {t('compos.openSketch')}
                  </Link>
                )}
              </>
            ),
            chords: (
              <>
                <ButtonLink
                  to={`/catalog/${song.id}/scene`}
                  variant="secondary"
                  size="sm"
                  icon="expand"
                  className="self-start"
                >
                  {t('catalog.fullScreen')}
                </ButtonLink>
                <SongChartPreviews
                  charts={song.charts}
                  instruments={instruments}
                  heldInstrumentIds={selectHeldInstrumentIds(
                    song.defaultLineup,
                    signedInMember.data,
                  )}
                  surface="song"
                />
              </>
            ),
            takes: (
              <SongTakes
                songId={song.id}
                songTitle={song.title}
                selectedTakeId={props.selectedTakeId}
                onSelectTake={props.onSelectTake}
              />
            ),
          }[props.tab]
        }
      </div>

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
