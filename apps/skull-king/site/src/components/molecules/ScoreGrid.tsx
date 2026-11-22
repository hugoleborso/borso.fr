import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import clsx from 'clsx';
import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatEntryDetail,
  formatPointsOrPending,
  selectEntry,
  selectEntryPoints,
  selectPointsTone,
} from '@site/lib/game-scores.core';
import type { GamePlayer, GameRound } from '@site/lib/game-view.core';
import { selectRoundCheck } from '@site/lib/round-results.core';
import { PlayerMark } from '../atoms/PlayerMark';
import { ScoreCell } from '../atoms/ScoreCell';

export interface ScoreGridProps {
  readonly players: readonly GamePlayer[];
  readonly rounds: readonly GameRound[];
  readonly onOpenCell: (roundNumber: number, playerId: string) => void;
}

const NO_POINTS = '–';
const ROUND_COLUMN_ID = 'round';

function RoundNumberCell({ round }: { readonly round: GameRound }) {
  const { t } = useTranslation();
  const check = selectRoundCheck(round, 0);
  return (
    <span
      aria-label={t('scores.roundCheck', {
        round: round.number,
        counted: check.counted,
        expected: check.expected,
      })}
      className={clsx(
        'flex flex-col items-center justify-center gap-1 text-sm font-bold',
        check.isBalanced ? 'text-muted-2' : 'text-accent',
      )}
    >
      {round.number}
      {check.isBalanced ? null : <span className="size-1.5 rounded-full bg-accent" />}
    </span>
  );
}

// @FollowsBlueprint molecule-presentational
export function ScoreGrid({ players, rounds, onOpenCell }: ScoreGridProps) {
  const { t } = useTranslation();
  const playedRounds = useMemo(() => [...rounds], [rounds]);
  const columns = useMemo<ColumnDef<GameRound>[]>(
    () => [
      {
        id: ROUND_COLUMN_ID,
        header: () => <span />,
        cell: ({ row }) => <RoundNumberCell round={row.original} />,
      },
      ...players.map((player): ColumnDef<GameRound> => ({
        id: player.id,
        header: () => (
          <span className="flex justify-center">
            <PlayerMark icon={player.icon} color={player.color} size="tiny" />
          </span>
        ),
        cell: ({ row }) => {
          const round = row.original;
          const points = selectEntryPoints(round, player.id);
          const shown = formatPointsOrPending(points, NO_POINTS);
          return (
            <ScoreCell
              points={shown}
              tone={selectPointsTone(points)}
              detail={formatEntryDetail(selectEntry(round, player.id))}
              label={t('scores.cell', { name: player.name, round: round.number, points: shown })}
              onPress={() => {
                onOpenCell(round.number, player.id);
              }}
            />
          );
        },
      })),
    ],
    [players, onOpenCell, t],
  );
  // eslint-disable-next-line react-hooks/incompatible-library -- @tanstack/react-table's useReactTable returns functions the React Compiler cannot memoize, so it skips compiling this component; the table object is read only by this component's own JSX below and never handed to a memoized child, so the skip changes nothing observable
  const table = useReactTable({
    data: playedRounds,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (round) => String(round.number),
  });
  const layout = {
    gridTemplateColumns: `2.25rem repeat(${String(players.length)}, minmax(0, 1fr))`,
  };
  return (
    <section aria-label={t('scores.detail')} className="overflow-hidden rounded-tile bg-surface">
      {table.getHeaderGroups().map((headerGroup) => (
        <div key={headerGroup.id} className="grid py-2" style={layout} aria-hidden="true">
          {headerGroup.headers.map((header) => (
            <Fragment key={header.id}>
              {flexRender(header.column.columnDef.header, header.getContext())}
            </Fragment>
          ))}
        </div>
      ))}
      {table.getRowModel().rows.map((row) => (
        <div key={row.id} className="grid border-t border-ground" style={layout}>
          {row.getVisibleCells().map((cell) => (
            <Fragment key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </Fragment>
          ))}
        </div>
      ))}
    </section>
  );
}
