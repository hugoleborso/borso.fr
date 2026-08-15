/**
 * Live mastery matrix. Members × instruments grid with three input
 * affordances per cell (spec use case 1bis):
 *
 *   - Tap a cell → focus and accept a numeric edit; emptying the box
 *     drops the override, which is the only one of the three gestures a
 *     finger can perform.
 *   - Scroll-wheel on a cell → ±1 (capped to [0, 10]).
 *   - Right-click on a cell → clear the override (fall back to default
 *     of "no score logged"; the row disappears from the API).
 *
 * Row averages and column averages are projected via
 * `mastery-matrix.utils.ts` and rendered alongside the grid; both
 * update live as scores change.
 *
 * The table layout is driven by `useReactTable` from
 * `@tanstack/react-table`: a leading "member" column, N instrument
 * columns built from the props, and a trailing "row average" column.
 * The footer row carries the per-instrument column averages.
 *
 * Mounted on /members per the spec (A07/A08).
 *
 * The matrix reads scores from `useMasteryDefaults()` directly and
 * writes through `useSaveMasteryDefault` / `useDeleteMasteryDefault`.
 * Those two hooks own the optimistic update: they patch the TanStack
 * Query cache in `onMutate`, roll it back in `onError`, and reconcile
 * in `onSettled`. This component only surfaces the error.
 */

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type Row,
  useReactTable,
} from '@tanstack/react-table';
import type { JSX } from 'react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api';
import {
  cellKey,
  clampScore,
  columnAverage,
  MASTERY_SCORE_MAX,
  MASTERY_SCORE_MIN,
  rowAverage,
  selectScoreEditIntent,
} from '../../lib/mastery-matrix.utils';
import { readableForeground } from '../../lib/member-color.utils';
import {
  useDeleteMasteryDefault,
  useMasteryDefaults,
  useSaveMasteryDefault,
} from '../../lib/queries/mastery';
import { Avatar } from '../atoms/Avatar';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { memberInitial } from '../atoms/member-palette.utils';
import { ScoreInput } from '../atoms/ScoreInput';

export interface MasteryMatrixMember {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

export interface MasteryMatrixInstrument {
  readonly id: string;
  readonly name: string;
}

interface MasteryMatrixProps {
  readonly members: readonly MasteryMatrixMember[];
  readonly instruments: readonly MasteryMatrixInstrument[];
  readonly onError: (message: string) => void;
}

interface MatrixRow {
  readonly member: MasteryMatrixMember;
}

/**
 * The matrix is wider than a phone, so the member's name has to stay put while
 * the instrument columns scroll under it — otherwise you scroll to reach the
 * last instrument and no longer know whose score you are typing. It carries
 * its own background because the cells travel underneath it.
 */
const STICKY_ROW_HEADER_CLASS = 'sticky left-0 z-10 bg-bg-elev';

/**
 * A sticky column has to leave the grid room to travel underneath it. Left
 * free, the name column takes the width of the longest first name — one
 * 61-character name grew it until it met the sticky average column and no
 * score box anywhere in the grid could be tapped at any scroll position. The
 * cell content is what a table's automatic layout measures, so the budget is
 * spent on an inner box that clips, not on the cell.
 */
const STICKY_ROW_HEADER_BUDGET_CLASS = 'flex items-center max-w-[7rem] sm:max-w-[12rem]';

/**
 * The per-member average is anchored to the right edge the way the name is
 * anchored to the left, so the column the operator reads the row for is on
 * screen at rest instead of past the fold, and the instrument columns visibly
 * travel underneath it — which is what says the grid scrolls sideways.
 */
const STICKY_AVERAGE_CLASS = 'sticky right-0 z-10 bg-bg-elev border-l border-line';

/**
 * The grid is wider than a phone by about 160 px. The scrollbar is drawn
 * rather than left to the platform's overlay one, which only appears once a
 * scroll is already under way, so the instrument column past the right edge
 * had nothing on screen saying it existed.
 */
const MATRIX_SCROLLER_CLASS =
  'overflow-x-scroll [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-bg-sunk ' +
  '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line-strong';

/**
 * A styled `::-webkit-scrollbar` reserves no layout space here — the track
 * measures zero — and iOS Safari draws no persistent scrollbar at all, so on a
 * phone the drawn one is not a cue anybody sees. The sentence is, and it costs
 * one line above the grid.
 */
const MATRIX_SCROLL_HINT_CLASS =
  'sm:hidden text-xs text-ink-400 m-0 mb-2 flex items-center gap-1.5';

const DECIMALS = 1;
const RIGHT_MOUSE_BUTTON = 2;

/**
 * @Blueprint organism-table
 * @BlueprintName Organism With Headless Table
 * @BlueprintUsage Use for a screen region showing tabular data with sorting or filtering.
 * @BlueprintDescription Composes molecules and atoms into a screen region, owns the interface state, and drives the grid through the headless useReactTable rather than a hand-rolled table with manual sort state. An organism is the lowest level allowed to call a query hook.
 */
export function MasteryMatrix({ members, instruments, onError }: MasteryMatrixProps): JSX.Element {
  const { t } = useTranslation();
  const defaults = useMasteryDefaults();
  const save = useSaveMasteryDefault();
  const remove = useDeleteMasteryDefault();

  const scores = useMemo<Record<string, number>>(() => {
    const scores: Record<string, number> = {};
    for (const row of defaults.data?.defaults ?? []) {
      scores[cellKey(row.memberId, row.instrumentId)] = row.score;
    }
    return scores;
  }, [defaults.data]);

  const memberIds = useMemo(() => members.map((member) => member.id), [members]);
  const instrumentIds = useMemo(
    () => instruments.map((instrument) => instrument.id),
    [instruments],
  );

  const writeScore = useCallback(
    (memberId: string, instrumentId: string, score: number): void => {
      save.mutate(
        { memberId, instrumentId, score },
        {
          onError: (error) => {
            onError(error instanceof ApiError ? error.message : 'unknown-error');
          },
        },
      );
    },
    [save, onError],
  );

  const clearScore = useCallback(
    (memberId: string, instrumentId: string): void => {
      remove.mutate(
        { memberId, instrumentId },
        {
          onError: (error) => {
            onError(error instanceof ApiError ? error.message : 'unknown-error');
          },
        },
      );
    },
    [remove, onError],
  );

  const memberRows = useMemo<MatrixRow[]>(() => members.map((member) => ({ member })), [members]);

  const columns = useMemo<ColumnDef<MatrixRow>[]>(() => {
    const memberColumn: ColumnDef<MatrixRow> = {
      id: 'member',
      header: () => null,
      cell: ({ row }) => (
        <span className={STICKY_ROW_HEADER_BUDGET_CLASS}>
          <Avatar
            size="xs"
            className="mr-2 shrink-0"
            initials={memberInitial(row.original.member.firstName)}
            color={row.original.member.color}
            style={{ color: readableForeground(row.original.member.color) }}
          />
          <span className="truncate text-ink-900" title={row.original.member.firstName}>
            {row.original.member.firstName}
          </span>
        </span>
      ),
    };
    const instrumentColumns: ColumnDef<MatrixRow>[] = instruments.map((instrument) => ({
      id: `inst:${instrument.id}`,
      header: () => instrument.name,
      cell: ({ row }: { row: Row<MatrixRow> }) => {
        const memberId = row.original.member.id;
        const value = scores[cellKey(memberId, instrument.id)] ?? null;
        return (
          <ScoreInput
            value={value}
            minimum={MASTERY_SCORE_MIN}
            maximum={MASTERY_SCORE_MAX}
            label={`${row.original.member.firstName} ${instrument.name}`}
            onStep={(step) => {
              const next = clampScore((value ?? MASTERY_SCORE_MIN) + step);
              if (next === value) return;
              writeScore(memberId, instrument.id, next);
            }}
            onEdit={(rawValue) => {
              const applyByIntent = {
                clear: (): void => clearScore(memberId, instrument.id),
                write: (): void =>
                  writeScore(memberId, instrument.id, clampScore(Number(rawValue))),
              } as const;
              applyByIntent[selectScoreEditIntent(rawValue)]();
            }}
            onClear={() => {
              clearScore(memberId, instrument.id);
            }}
          />
        );
      },
    }));
    const averageColumn: ColumnDef<MatrixRow> = {
      id: 'row-average',
      header: () => t('members.rowAverage'),
      cell: ({ row }) => {
        const average = rowAverage(row.original.member.id, instrumentIds, scores);
        return average === null ? '—' : average.toFixed(DECIMALS);
      },
    };
    return [memberColumn, ...instrumentColumns, averageColumn];
  }, [instruments, instrumentIds, scores, writeScore, clearScore, t]);

  const table = useReactTable({
    data: memberRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section
      className="bg-bg-elev border border-line rounded-lg p-4"
      memberRows-testid="mastery-matrix"
    >
      <h3 className="font-display italic text-2xl text-ink-900 m-0 mb-1">
        {t('members.masteryMatrixTitle')}
      </h3>
      <p className="text-xs text-ink-500 m-0 mb-4 leading-relaxed">
        {t('members.masteryMatrixSubtitle')}
      </p>
      {members.length === 0 || instruments.length === 0 ? (
        <p className="text-sm text-ink-400 italic">{t('mastery.noData')}</p>
      ) : (
        <>
          <p className={MATRIX_SCROLL_HINT_CLASS}>
            <Icon name="drag" size={12} />
            {t('members.masteryMatrixScrollHint')}
          </p>
          <div className={MATRIX_SCROLLER_CLASS}>
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header, headerIndex) => {
                      const isLast = headerIndex === headerGroup.headers.length - 1;
                      const isFirst = headerIndex === 0;
                      const className = isFirst
                        ? STICKY_ROW_HEADER_CLASS
                        : isLast
                          ? composeClassName(
                              'text-right font-medium text-xs tracking-wider uppercase text-ink-500 px-3 py-3 border-b border-line',
                              STICKY_AVERAGE_CLASS,
                            )
                          : 'text-center font-medium text-xs tracking-wider uppercase text-ink-500 px-2 py-3 border-b border-line align-bottom';
                      return (
                        <th key={header.id} className={className}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-[rgba(26,22,18,0.02)]">
                    {row.getVisibleCells().map((cell, cellIndex) => {
                      const isFirst = cellIndex === 0;
                      const isLast = cellIndex === row.getVisibleCells().length - 1;
                      if (isFirst) {
                        return (
                          <th
                            key={cell.id}
                            scope="row"
                            className={composeClassName(
                              'text-left px-3 py-2 border-b border-line',
                              STICKY_ROW_HEADER_CLASS,
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </th>
                        );
                      }
                      if (isLast) {
                        return (
                          <td
                            key={cell.id}
                            className={composeClassName(
                              'text-right px-3 py-1 border-b border-line font-mono text-ink-500',
                              STICKY_AVERAGE_CLASS,
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      }
                      const instrumentId = cell.column.id.replace('inst:', '');
                      return (
                        <td
                          key={cell.id}
                          className="px-1 py-1 border-b border-line"
                          onAuxClick={(event) => {
                            if (event.button !== RIGHT_MOUSE_BUTTON) return;
                            event.preventDefault();
                            clearScore(row.original.member.id, instrumentId);
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-bg-sunk">
                  <th
                    scope="row"
                    className={composeClassName(
                      'text-left px-3 py-3 font-medium text-ink-500 text-xs tracking-wider uppercase',
                      STICKY_ROW_HEADER_CLASS,
                      'bg-bg-sunk',
                    )}
                  >
                    {t('members.columnAverage')}
                  </th>
                  {instruments.map((instrument) => {
                    const average = columnAverage(instrument.id, memberIds, scores);
                    return (
                      <td
                        key={instrument.id}
                        className="text-center px-1 py-3 font-mono text-ink-500"
                      >
                        {average === null ? '—' : average.toFixed(DECIMALS)}
                      </td>
                    );
                  })}
                  <td
                    className={composeClassName('px-3 py-3', STICKY_AVERAGE_CLASS, 'bg-bg-sunk')}
                  />
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
