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
 * Mounted on /members per the spec (A07/A08 — the matrix lives ON the
 * members page, not on a dedicated /mastery route).
 *
 * The matrix reads scores from `useMasteryDefaults()` directly and
 * writes through `useSaveMasteryDefault` / `useDeleteMasteryDefault`.
 * Optimistic UI: each write mutation patches the TanStack Query
 * cache in `onMutate`, rolls back in `onError`, and lets the on-
 * `Success` invalidation reconcile with the server.
 */

import { useQueryClient } from '@tanstack/react-query';
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

const RIGHT_BUTTON = 2;
const DECIMALS = 1;

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

  const handleWheel = (
    event: WheelEvent<HTMLInputElement>,
    memberId: string,
    instrumentId: string,
    current: number,
  ): void => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 1 : -1;
    const next = clampScore(current + delta);
    if (next === current) return;
    writeScore(memberId, instrumentId, next);
  };

  const handleContextMenu = (
    event: MouseEvent<HTMLInputElement>,
    memberId: string,
    instrumentId: string,
  ): void => {
    event.preventDefault();
    clearScore(memberId, instrumentId);
  };

  const handleAuxClick = (
    event: MouseEvent<HTMLTableCellElement>,
    memberId: string,
    instrumentId: string,
  ): void => {
    if (event.button !== RIGHT_BUTTON) return;
    event.preventDefault();
    clearScore(memberId, instrumentId);
  };

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
            <tr>
              <th />
              {instruments.map((instrument) => (
                <th
                  key={instrument.id}
                  className="text-center font-medium text-[10.5px] tracking-wider uppercase text-ink-500 px-2 py-3 border-b border-line align-bottom"
                >
                  {instrument.name}
                </th>
              ))}
              <th className="text-right font-medium text-[10.5px] tracking-wider uppercase text-ink-500 px-4 py-3 border-b border-line">
                {t('members.rowAverage')}
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const average = rowAverage(member.id, instrumentIds, scores);
              return (
                <tr key={member.id} className="hover:bg-[rgba(26,22,18,0.02)]">
                  <th scope="row" className="text-left px-3 py-2 border-b border-line">
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold mr-2 align-middle"
                      style={{
                        background: member.color,
                        color: readableForeground(member.color),
                      }}
                    >
                      {member.firstName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="align-middle text-ink-900">{member.firstName}</span>
                  </th>
                  {instruments.map((instrument) => {
                    const value = scores[cellKey(member.id, instrument.id)] ?? 0;
                    return (
                      <td
                        key={instrument.id}
                        className="px-1 py-1 border-b border-line"
                        onAuxClick={(event) => handleAuxClick(event, member.id, instrument.id)}
                      >
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={value}
                          aria-label={`${member.firstName} ${instrument.name}`}
                          onWheel={(event) => handleWheel(event, member.id, instrument.id, value)}
                          onContextMenu={(event) =>
                            handleContextMenu(event, member.id, instrument.id)
                          }
                          onChange={(event) => {
                            const parsed = clampScore(Number(event.target.value));
                            writeScore(member.id, instrument.id, parsed);
                          }}
                          className="w-12 text-center bg-bg-elev border border-line rounded-sm text-xs py-1 outline-none focus:border-ink-700 font-mono"
                        />
                      </td>
                    );
                  })}
                  <td className="text-right px-4 py-1 border-b border-line font-mono text-ink-500">
                    {average === null ? '—' : average.toFixed(DECIMALS)}
                  </td>
                </tr>
              );
            })}
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
