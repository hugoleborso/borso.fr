/** @Feature songs */

import { Link } from 'react-router-dom';
import { useSongLongPress } from '../../lib/song-long-press.hook';
import { buildTonalityLabel } from '../../routes/catalog/tonality-label.utils';
import { AlbumCover } from '../atoms/AlbumCover';
import { type ChartKind, ChartKindIcon } from '../molecules/ChartKindIcon';
import { EnergyBadge } from '../molecules/EnergyBadge';
import { MasteryBadge } from '../molecules/MasteryBadge';
import { type LineupInstrument, type LineupMember, MemberLineup } from '../molecules/MemberLineup';
import { type SongStatus, StatusChip } from '../molecules/StatusChip';

export interface SongCardProps {
  id: string;
  title: string;
  artist: string;
  deezerAlbumId: string | null;
  deezerTrackId: string | null;
  spotifyTrackId: string | null;
  status: SongStatus;
  tonalityStart: string | null;
  tonalityEnd: string | null;
  chartKind: ChartKind;
  baseEnergy: number | null;
  meanMastery: number | null;
  defaultLineup: Record<string, readonly string[]>;
  members: readonly LineupMember[];
  instruments: readonly LineupInstrument[];
}

/**
 * @Blueprint organism-presentational
 * @BlueprintName Presentational Organism
 * @BlueprintUsage Use for a screen region that composes molecules and atoms but owns no state and fetches nothing.
 * @BlueprintDescription Takes every value it draws as a prop, composes molecules and atoms only, and delegates its one derived string to the covered `buildTonalityLabel` instead of computing it inline. Holding no state and no query is what lets the route above it decide when the card re-renders.
 */
export function SongCard({
  id,
  title,
  artist,
  deezerAlbumId,
  deezerTrackId,
  spotifyTrackId,
  status,
  tonalityStart,
  tonalityEnd,
  chartKind,
  baseEnergy,
  meanMastery,
  defaultLineup,
  members,
  instruments,
}: SongCardProps): JSX.Element {
  const tonalityLabel = buildTonalityLabel(tonalityStart, tonalityEnd);
  const longPress = useSongLongPress({ title, artist, deezerTrackId, spotifyTrackId });
  return (
    <Link
      to={`/catalog/${id}`}
      {...longPress}
      className="block bg-bg-elev border border-line rounded-lg p-4 transition-all duration-100 hover:-translate-y-px hover:border-line-strong select-none"
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <StatusChip status={status} />
        <ChartKindIcon kind={chartKind} />
      </div>
      <div className="flex items-start gap-3">
        <AlbumCover title={title} deezerAlbumId={deezerAlbumId} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display italic text-[22px] leading-tight tracking-[-0.01em] text-ink-900 m-0 mb-1">
            {title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <span className="truncate">{artist}</span>
            {tonalityLabel !== null && (
              <>
                <span className="text-ink-300">·</span>
                <span className="font-mono text-xs">{tonalityLabel}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        <EnergyBadge value={baseEnergy} />
        <MasteryBadge value={meanMastery} />
        <span className="flex-1" />
        <MemberLineup lineup={defaultLineup} members={members} instruments={instruments} />
      </div>
    </Link>
  );
}
