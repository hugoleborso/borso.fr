/**
 * Live mastery matrix. Members × instruments grid with three input
 * affordances per cell (spec use case 1bis):
 *
 *   - Click a cell → focus and accept a numeric edit.
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
 * Optimistic UI: each write mutation patches the TanStack Query
 * cache in `onMutate`, rolls back in `onError`, and lets the on-
 * `Success` invalidation reconcile with the server.
 */

import { useQueryClient } from '@tanstack/react-query';
import {
  type ColumnDef,
  type Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { JSX, MouseEvent, WheelEvent } from 'react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api';
import { cellKey, clampScore, columnAverage, rowAverage } from '../../lib/mastery-matrix.utils';
import { readableForeground } from '../../lib/member-color.utils';
import {
  masteryKeys,
  useDeleteMasteryDefault,
  useMasteryDefaults,
  useSaveMasteryDefault,
} from '../../lib/queries/mastery';

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

interface MasteryDefaultsResponse {
  defaults: { memberId: string; instrumentId: string; score: number }[];
}

interface MatrixRow {
  readonly member: MasteryMatrixMember;
}

const DECIMALS = 1;
const RIGHT_MOUSE_BUTTON = 2;

function setCachedScore(
  previous: MasteryDefaultsResponse | undefined,
  memberId: string,
  instrumentId: string,
  score: number,
): MasteryDefaultsResponse {
  const base = previous?.defaults ?? [];
  const without = base.filter(
    (row) => !(row.memberId === memberId && row.instrumentId === instrumentId),
  );
  return { defaults: [...without, { memberId, instrumentId, score }] };
}

function deleteCachedScore(
  previous: MasteryDefaultsResponse | undefined,
  memberId: string,
  instrumentId: string,
): MasteryDefaultsResponse {
  const base = previous?.defaults ?? [];
  return {
    defaults: base.filter(
      (row) => !(row.memberId === memberId && row.instrumentId === instrumentId),
    ),
  };
}

export function MasteryMatrix({
  members,
  instruments,
  onError,
}: MasteryMatrixProps): JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const defaults = useMasteryDefaults();
  const save = useSaveMasteryDefault();
  const remove = useDeleteMasteryDefault();

  const scores = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {};
    for (const row of defaults.data?.defaults ?? []) {
      result[cellKey(row.memberId, row.instrumentId)] = row.score;
    }
    return result;
  }, [defaults.data]);

  const memberIds = useMemo(() => members.map((member) => member.id), [members]);
  const instrumentIds = useMemo(
    () => instruments.map((instrument) => instrument.id),
    [instruments],
  );

  const writeScore = useCallback(
    (memberId: string, instrumentId: string, score: number): void => {
      const previous = queryClient.getQueryData<MasteryDefaultsResponse>(masteryKeys.defaults());
      queryClient.setQueryData<MasteryDefaultsResponse>(masteryKeys.defaults(), (current) =>
        setCachedScore(current, memberId, instrumentId, score),
      );
      save.mutate(
        { memberId, instrumentId, score },
        {
          onError: (error) => {
            if (previous !== undefined) {
              queryClient.setQueryData(masteryKeys.defaults(), previous);
            }
            onError(error instanceof ApiError ? error.message : 'unknown-error');
          },
        },
      );
    },
    [queryClient, save, onError],
  );

  const clearScore = useCallback(
    (memberId: string, instrumentId: string): void => {
      const previous = queryClient.getQueryData<MasteryDefaultsResponse>(masteryKeys.defaults());
      queryClient.setQueryData<MasteryDefaultsResponse>(masteryKeys.defaults(), (current) =>
        deleteCachedScore(current, memberId, instrumentId),
      );
      remove.mutate(
        { memberId, instrumentId },
        {
          onError: (error) => {
            if (previous !== undefined) {
              queryClient.setQueryData(masteryKeys.defaults(), previous);
            }
            onError(error instanceof ApiError ? error.message : 'unknown-error');
          },
        },
      );
    },
    [queryClient, remove, onError],
  );

  const data = useMemo<MatrixRow[]>(
    () => members.map((member) => ({ member })),
    [members],
  );

  const columns = useMemo<ColumnDef<MatrixRow>[]>(() => {
    const memberColumn: ColumnDef<MatrixRow> = {
      id: 'member',
      header: () => null,
      cell: ({ row }) => (
        <>
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold mr-2 align-middle"
            style={{
              background: row.original.member.color,
              color: readableForeground(row.original.member.color),
            }}
          >
            {row.original.member.firstName.slice(0, 1).toUpperCase()}
          </span>
          <span className="align-middle text-ink-900">{row.original.member.firstName}</span>
        </>
      ),
    };
    const instrumentColumns: ColumnDef<MatrixRow>[] = instruments.map((instrument) => ({
      id: `inst:${instrument.id}`,
      header: () => instrument.name,
      cell: ({ row }: { row: Row<MatrixRow> }) => {
        const memberId = row.original.member.id;
        const value = scores[cellKey(memberId, instrument.id)] ?? 0;
        const onWheel = (event: WheelEvent<HTMLInputElement>): void => {
          event.preventDefault();
          const delta = event.deltaY < 0 ? 1 : -1;
          const next = clampScore(value + delta);
          if (next === value) return;
          writeScore(memberId, instrument.id, next);
        };
        const onContextMenu = (event: MouseEvent<HTMLInputElement>): void => {
          event.preventDefault();
          clearScore(memberId, instrument.id);
        };
        return (
          <input
            type="number"
            min={0}
            max={10}
            value={value}
            aria-label={`${row.original.member.firstName} ${instrument.name}`}
            onWheel={onWheel}
            onContextMenu={onContextMenu}
            onChange={(event) => {
              const parsed = clampScore(Number(event.target.value));
              writeScore(memberId, instrument.id, parsed);
            }}
            className="w-12 text-center bg-bg-elev border border-line rounded-sm text-xs py-1 outline-none focus:border-ink-700 font-mono"
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
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section
      className="bg-bg-elev border border-line rounded-lg p-4 overflow-x-auto"
      data-testid="mastery-matrix"
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
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, headerIndex) => {
                  const isLast = headerIndex === headerGroup.headers.length - 1;
                  const isFirst = headerIndex === 0;
                  const className = isFirst
                    ? ''
                    : isLast
                      ? 'text-right font-medium text-[10.5px] tracking-wider uppercase text-ink-500 px-4 py-3 border-b border-line'
                      : 'text-center font-medium text-[10.5px] tracking-wider uppercase text-ink-500 px-2 py-3 border-b border-line align-bottom';
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
                        className="text-left px-3 py-2 border-b border-line"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </th>
                    );
                  }
                  if (isLast) {
                    return (
                      <td
                        key={cell.id}
                        className="text-right px-4 py-1 border-b border-line font-mono text-ink-500"
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
                className="text-left px-3 py-3 font-medium text-ink-500 text-[10.5px] tracking-wider uppercase"
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
              <td className="px-4 py-3" />
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}
