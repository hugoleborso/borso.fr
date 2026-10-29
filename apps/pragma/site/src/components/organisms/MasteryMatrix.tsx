import { MASTERY_SCORE_MAX, MASTERY_SCORE_MIN } from '@domain/input-limits.core';
/** @Feature mastery */

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
import { ApiError } from '../../lib/api.client';
import {
  cellKey,
  clampScore,
  columnAverage,
  rowAverage,
  selectScoreEditIntent,
} from '../../lib/mastery-matrix.utils';
import {
  useDeleteMasteryDefault,
  useMasteryDefaults,
  useSaveMasteryDefault,
} from '../../lib/queries/mastery.queries';
import { Avatar } from '../atoms/Avatar';
import { composeClassName } from '../atoms/class-name.utils';
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
  readonly instrument: MasteryMatrixInstrument;
}

const INSTRUMENT_COLUMN_CLASS = 'w-20 sm:w-44';
const HEADER_CELL_CLASS = 'px-0.5 pt-1 pb-2 align-bottom border-b border-rule font-normal';
const SCORE_CELL_CLASS = 'px-0.5 py-1 border-b border-rule text-center align-middle';
const AVERAGE_CELL_CLASS = 'px-0.5 py-2 text-center font-mono text-meta text-ink-soft';

const DECIMALS = 1;
const RIGHT_MOUSE_BUTTON = 2;
const NO_AVERAGE = '—';

function formatAverage(average: number | null): string {
  return average === null ? NO_AVERAGE : average.toFixed(DECIMALS);
}

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

  const instrumentRows = useMemo<MatrixRow[]>(
    () => instruments.map((instrument) => ({ instrument })),
    [instruments],
  );

  const columns = useMemo<ColumnDef<MatrixRow>[]>(() => {
    const instrumentColumn: ColumnDef<MatrixRow> = {
      id: 'instrument',
      header: () => null,
      cell: ({ row }) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-meta text-ink" title={row.original.instrument.name}>
            {row.original.instrument.name}
          </span>
          <span className="font-mono text-label text-ink-soft">
            {t('members.columnAverage')}{' '}
            {formatAverage(columnAverage(row.original.instrument.id, memberIds, scores))}
          </span>
        </span>
      ),
    };
    const memberColumns: ColumnDef<MatrixRow>[] = members.map((member) => ({
      id: `member:${member.id}`,
      header: () => (
        <span className="flex min-w-0 flex-col items-center gap-1">
          <Avatar size="md" initials={memberInitial(member.firstName)} color={member.color} />
          <span className="w-full truncate text-label text-ink" title={member.firstName}>
            {member.firstName}
          </span>
        </span>
      ),
      cell: ({ row }: { row: Row<MatrixRow> }) => {
        const instrumentId = row.original.instrument.id;
        const value = scores[cellKey(member.id, instrumentId)] ?? null;
        return (
          <ScoreInput
            value={value}
            minimum={MASTERY_SCORE_MIN}
            maximum={MASTERY_SCORE_MAX}
            label={`${member.firstName} ${row.original.instrument.name}`}
            onStep={(step) => {
              const next = clampScore((value ?? MASTERY_SCORE_MIN) + step);
              if (next === value) return;
              writeScore(member.id, instrumentId, next);
            }}
            onEdit={(rawValue) => {
              const applyByIntent = {
                clear: (): void => clearScore(member.id, instrumentId),
                write: (): void =>
                  writeScore(member.id, instrumentId, clampScore(Number(rawValue))),
              } as const;
              applyByIntent[selectScoreEditIntent(rawValue)]();
            }}
            onClear={() => {
              clearScore(member.id, instrumentId);
            }}
          />
        );
      },
    }));
    return [instrumentColumn, ...memberColumns];
  }, [members, memberIds, scores, writeScore, clearScore, t]);

  // eslint-disable-next-line react-hooks/incompatible-library -- @tanstack/react-table's useReactTable returns functions the React Compiler cannot memoize, so it skips compiling this component; the table object is read only by this component's own JSX below and never handed to a memoized child, so the skip changes nothing observable
  const table = useReactTable({
    data: instrumentRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section
      className="rounded-lg border border-rule bg-leaf p-3 sm:p-4"
      data-testid="mastery-matrix"
    >
      <h3 className="font-display text-title text-ink m-0 mb-4">
        {t('members.masteryMatrixTitle')}
      </h3>
      {members.length === 0 || instruments.length === 0 ? (
        <p className="text-meta text-ink-soft italic">{t('mastery.noData')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-meta">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, headerIndex) => (
                    <th
                      key={header.id}
                      scope="col"
                      className={composeClassName(
                        HEADER_CELL_CLASS,
                        headerIndex === 0 && INSTRUMENT_COLUMN_CLASS,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-hover">
                  {row.getVisibleCells().map((cell, cellIndex) => {
                    if (cellIndex === 0) {
                      return (
                        <th
                          key={cell.id}
                          scope="row"
                          className="border-b border-rule py-1 pr-2 text-left font-normal"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </th>
                      );
                    }
                    const memberId = cell.column.id.replace('member:', '');
                    return (
                      <td
                        key={cell.id}
                        className={SCORE_CELL_CLASS}
                        onAuxClick={(event) => {
                          if (event.button !== RIGHT_MOUSE_BUTTON) return;
                          event.preventDefault();
                          clearScore(memberId, row.original.instrument.id);
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-sunk">
                <th
                  scope="row"
                  className="py-2 pr-2 pl-1 text-left text-label font-medium tracking-wider text-ink-soft uppercase"
                >
                  {t('members.rowAverage')}
                </th>
                {members.map((member) => (
                  <td key={member.id} className={AVERAGE_CELL_CLASS}>
                    {formatAverage(rowAverage(member.id, instrumentIds, scores))}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
