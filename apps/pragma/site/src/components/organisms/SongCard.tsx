/**
 * SongCard — the editorial card the prototype renders in the catalog
 * grid. Composes:
 *  - StatusChip (top-left),
 *  - ChartKindIcon (top-right),
 *  - serif italic title (font-display),
 *  - artist + tonality meta row,
 *  - MemberLineup footer (bare avatars).
 */

import { Link } from 'react-router-dom';
import { ChartKindIcon, type ChartKind } from '../molecules/ChartKindIcon';
import { type LineupInstrument, type LineupMember, MemberLineup } from '../molecules/MemberLineup';
import { StatusChip, type SongStatus } from '../molecules/StatusChip';

export interface SongCardProps {
  id: string;
  title: string;
  artist: string;
  status: SongStatus;
  tonalityStart: string | null;
  tonalityEnd: string | null;
  chartKind: ChartKind;
  defaultLineup: Record<string, string>;
  members: readonly LineupMember[];
  instruments: readonly LineupInstrument[];
}

export function SongCard({
  id,
  title,
  artist,
  status,
  tonalityStart,
  tonalityEnd,
  chartKind,
  defaultLineup,
  members,
  instruments,
}: SongCardProps): JSX.Element {
  const tonalityLabel = (() => {
    if (tonalityStart === null) return null;
    if (tonalityEnd !== null && tonalityEnd !== tonalityStart) {
      return `${tonalityStart} → ${tonalityEnd}`;
    }
    return tonalityStart;
  })();
  return (
    <Link
      to={`/catalog/${id}`}
      className="block bg-bg-elev border border-line rounded-lg p-4 transition-all duration-100 hover:-translate-y-px hover:border-line-strong"
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <StatusChip status={status} />
        <ChartKindIcon kind={chartKind} />
      </div>
      <h3 className="font-display italic text-[22px] leading-tight tracking-[-0.01em] text-ink-900 m-0 mb-1">
        {title}
      </h3>
      <div className="flex items-center gap-2 text-[11.5px] text-ink-500">
        <span className="truncate">{artist}</span>
        {tonalityLabel !== null && (
          <>
            <span className="text-ink-300">·</span>
            <span className="font-mono text-[11px]">{tonalityLabel}</span>
          </>
        )}
      </div>
      <div className="mt-3">
        <MemberLineup
          lineup={defaultLineup}
          members={members}
          instruments={instruments}
        />
      </div>
    </Link>
  );
}
