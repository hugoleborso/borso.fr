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
import { buildTonalityLabel } from '../../routes/catalog/tonality-label.utils';
import { type ChartKind, ChartKindIcon } from '../molecules/ChartKindIcon';
import { EnergyBadge } from '../molecules/EnergyBadge';
import { MasteryBadge } from '../molecules/MasteryBadge';
import { type LineupInstrument, type LineupMember, MemberLineup } from '../molecules/MemberLineup';
import { type SongStatus, StatusChip } from '../molecules/StatusChip';

export interface SongCardProps {
  id: string;
  title: string;
  artist: string;
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
      <div className="flex items-center gap-1.5 mt-3">
        <EnergyBadge value={baseEnergy} />
        <MasteryBadge value={meanMastery} />
        <span className="flex-1" />
        <MemberLineup lineup={defaultLineup} members={members} instruments={instruments} />
      </div>
    </Link>
  );
}
