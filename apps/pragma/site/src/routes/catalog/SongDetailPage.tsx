/**
 * Read-only song detail page — mirrors the prototype's `SongDetail`
 * (design-bundle/project/src/screens/catalog.jsx lines 141-260):
 *  - header carries the status chip, chart-kind badge, title, artist
 *    + tonality + status meta, and right-side actions (Edit / Mode
 *    stage view),
 *  - left column: chord-chart preview card + external-links card
 *    (oEmbed iframes via SongExternalLinks),
 *  - right aside: default-lineup card (member chip + instrument
 *    tag), mastery card (ten coloured bars per member, score x/10).
 *
 * The edit form lives in SongEditPage.tsx at /catalog/:songId/edit;
 * pressing the Edit button navigates there.
 */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { composeClassName } from '../../components/atoms/class-name.utils';
import { Icon } from '../../components/atoms/Icon';
import { ChartKindIcon } from '../../components/molecules/ChartKindIcon';
import { LineupEditor, type LineupRecord } from '../../components/molecules/LineupEditor';
import { SongEmbed } from '../../components/molecules/SongEmbed';
import { StatusChip } from '../../components/molecules/StatusChip';
import { UploadedChartPreview } from '../../components/molecules/UploadedChartPreview';
import { ChordChartViewer } from '../../components/organisms/ChordChartViewer';
import { SongDetailSidebar } from '../../components/organisms/SongDetailSidebar';
import { ApiError } from '../../lib/api';
import { resolveEmbed } from '../../lib/embed.utils';
import { useInstrumentsList } from '../../lib/queries/instruments';
import { useMasteryDefaults } from '../../lib/queries/mastery';
import { useMembersList } from '../../lib/queries/members';
import { useSong, useUpdateSong } from '../../lib/queries/songs';
import { useSignedChartUrl } from '../../lib/queries/uploads';
import { extractChartKind, selectChordProText } from './chart-kind.utils';
import { buildMasteryKey, buildSongLineupRows } from './song-lineup.core';
import { buildTonalityLabel } from './tonality-label.utils';

const NO_ROWS: readonly never[] = [];
const MAX_TONALITY_RENDER_LENGTH = 16;

export function SongDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const { songId } = useParams<{ songId: string }>();
  const songQuery = useSong(songId ?? '', songId !== undefined);
  const membersQuery = useMembersList();
  const instrumentsQuery = useInstrumentsList();
  const masteryQuery = useMasteryDefaults();
  const updateSong = useUpdateSong();
  const [lineupEditorOpen, setLineupEditorOpen] = useState<boolean>(false);

  const song = songQuery.data?.song ?? null;
  const chart = song?.chart ?? null;
  const uploadedChart =
    chart !== null && (chart.kind === 'pdf' || chart.kind === 'image') ? chart : null;
  const signedChartUrlQuery = useSignedChartUrl(uploadedChart?.s3Key ?? null);
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
  const error =
    songQuery.error instanceof ApiError
      ? songQuery.error.message
      : (membersQuery.error ?? instrumentsQuery.error ?? masteryQuery.error) instanceof ApiError
        ? 'load-failed'
        : null;

  const masteryLookup = useMemo(() => {
    const lookup = new Map<string, number>();
    for (const row of masteryDefaults) {
      lookup.set(buildMasteryKey(row.memberId, row.instrumentId), row.score);
    }
    return lookup;
  }, [masteryDefaults]);

  const lineupRows = useMemo(
    () => buildSongLineupRows(song?.defaultLineup ?? {}, members, instruments, masteryLookup),
    [song, members, instruments, masteryLookup],
  );

  const lineupEditorMembers = useMemo(
    () => members.map((member) => ({ id: member.id, name: member.firstName, color: member.color })),
    [members],
  );
  const lineupEditorInstruments = useMemo(
    () => instruments.map((instrument) => ({ id: instrument.id, name: instrument.name })),
    [instruments],
  );

  const saveSongLineup = (lineup: LineupRecord | null): void => {
    if (song === null) return;
    updateSong.mutate({ id: song.id, defaultLineup: lineup ?? {} });
  };

  if (isLoading) {
    return <p className="px-4 sm:px-9 py-7 text-ink-400 italic text-sm">{t('common.loading')}</p>;
  }
  if (song === null) {
    return (
      <p className="px-4 sm:px-9 py-7 text-danger text-sm" role="alert">
        {error ?? 'not-found'}
      </p>
    );
  }

  const chartKind = extractChartKind(song.chart ?? null);
  const chordProText = selectChordProText(song.chart ?? null);
  const tonality = buildTonalityLabel(song.tonalityStart, song.tonalityEnd);
  const labelClass = 'text-[11px] tracking-wider uppercase text-ink-400 font-medium';

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px] flex flex-col gap-5">
      <Link
        to="/catalog"
        className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900 transition-colors no-underline"
      >
        <Icon name="chevL" size={14} />
        {t('catalog.backToCatalog')}
      </Link>

      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-[11px] tracking-wider uppercase text-ink-500 mb-1">
            {song.artist.length > 0 ? song.artist : t('catalog.crumb')}
          </div>
          <h1 className="font-display italic text-[40px] sm:text-[56px] leading-[0.95] tracking-[-0.015em] text-ink-900 m-0 mb-2">
            {song.title}
          </h1>
          <div className="flex items-center gap-2.5 text-[13px] text-ink-500 flex-wrap">
            <span>{song.artist}</span>
            {tonality === null ? null : (
              <>
                <span className="text-ink-300">·</span>
                <span className="font-mono text-xs">
                  {tonality.slice(0, MAX_TONALITY_RENDER_LENGTH)}
                </span>
              </>
            )}
            <span className="text-ink-300">·</span>
            <StatusChip status={song.status} />
            <span className="text-ink-300">·</span>
            <ChartKindIcon kind={chartKind} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/catalog/${song.id}/edit`}>
            <Button variant="default" type="button">
              <Icon name="edit" size={14} />
              {t('common.edit')}
            </Button>
          </Link>
          <Link to={`/catalog/${song.id}/scene`}>
            <Button variant="accent" type="button">
              <Icon name="play" size={14} />
              {t('catalog.openScene')}
            </Button>
          </Link>
        </div>
      </header>

      {error === null ? null : (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          {chordProText === null ? null : (
            <Card variant="bare">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line bg-bg-sunk">
                <Icon name="text" size={14} className="text-ink-500" />
                <span className="text-xs font-medium">{t('catalog.previewTitle')}</span>
                <span className="flex-1" />
                <Link
                  to={`/catalog/${song.id}/scene`}
                  className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-900 no-underline"
                >
                  <Icon name="play" size={12} />
                  {t('catalog.openScene')}
                </Link>
              </div>
              <div className="p-4">
                <ChordChartViewer source={chordProText} compact />
              </div>
            </Card>
          )}

          {uploadedChart === null ? null : (
            <Card variant="bare">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line bg-bg-sunk">
                <Icon
                  name={uploadedChart.kind === 'pdf' ? 'pdf' : 'image'}
                  size={14}
                  className="text-ink-500"
                />
                <span className="text-xs font-medium">{t('catalog.previewTitle')}</span>
              </div>
              <div className="p-4">
                <UploadedChartPreview
                  kind={uploadedChart.kind}
                  objectKey={uploadedChart.s3Key}
                  previewUrl={signedChartUrlQuery.data?.getUrl ?? null}
                  errorMessage={
                    signedChartUrlQuery.error instanceof ApiError
                      ? signedChartUrlQuery.error.message
                      : null
                  }
                />
              </div>
            </Card>
          )}

          {song.links.length > 0 ? (
            <Card>
              <div className={composeClassName(labelClass, 'mb-2.5')}>
                {t('catalog.linksTitle')}
              </div>
              <ul className="flex flex-col gap-2">
                {song.links.map((link) => {
                  const embed = resolveEmbed(link.url);
                  return (
                    <li
                      key={link.url}
                      className="bg-bg border border-line rounded-md p-2 flex items-start gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <SongEmbed
                          embed={embed}
                          title={`${link.provider}-${link.url}`}
                          iframeClassName="rounded-md max-w-full"
                        />
                        {link.comment.length > 0 ? (
                          <div className="text-[11px] text-ink-500 mt-1">{link.comment}</div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}
        </div>

        <SongDetailSidebar
          lineupRows={lineupRows}
          baseEnergy={song.baseEnergy}
          onEditDefaultLineup={() => setLineupEditorOpen(true)}
        />
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
    </section>
  );
}
