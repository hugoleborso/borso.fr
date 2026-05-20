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
 */

import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError, apiRequest } from '../lib/api-client';
import {
  cellKey,
  clampScore,
  columnAverage,
  rowAverage,
} from '../lib/mastery-matrix.utils';
import { readableForeground } from '../lib/member-color.utils';

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
  readonly scores: Readonly<Record<string, number>>;
  readonly onScoresChange: (next: Record<string, number>) => void;
  readonly onError: (message: string) => void;
}

const RIGHT_BUTTON = 2;

export function MasteryMatrix({
  members,
  instruments,
  scores,
  onScoresChange,
  onError,
}: MasteryMatrixProps): JSX.Element {
  const { t } = useTranslation();

  const memberIds = useMemo(() => members.map((member) => member.id), [members]);
  const instrumentIds = useMemo(
    () => instruments.map((instrument) => instrument.id),
    [instruments],
  );

  const writeScore = useCallback(
    async (memberId: string, instrumentId: string, score: number): Promise<void> => {
      try {
        await apiRequest('/api/mastery/defaults', {
          method: 'PUT',
          body: { memberId, instrumentId, score },
        });
        const key = cellKey(memberId, instrumentId);
        onScoresChange({ ...scores, [key]: score });
      } catch (caught) {
        onError(caught instanceof ApiError ? caught.message : 'unknown-error');
      }
    },
    [onError, onScoresChange, scores],
  );

  const clearScore = useCallback(
    async (memberId: string, instrumentId: string): Promise<void> => {
      try {
        await apiRequest(`/api/mastery/defaults/${memberId}/${instrumentId}`, {
          method: 'DELETE',
        });
        const next = { ...scores };
        delete next[cellKey(memberId, instrumentId)];
        onScoresChange(next);
      } catch (caught) {
        onError(caught instanceof ApiError ? caught.message : 'unknown-error');
      }
    },
    [onError, onScoresChange, scores],
  );

  const handleWheel = (
    event: React.WheelEvent<HTMLInputElement>,
    memberId: string,
    instrumentId: string,
    current: number,
  ): void => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 1 : -1;
    const next = clampScore(current + delta);
    if (next === current) return;
    void writeScore(memberId, instrumentId, next);
  };

  const handleContextMenu = (
    event: React.MouseEvent<HTMLInputElement>,
    memberId: string,
    instrumentId: string,
  ): void => {
    event.preventDefault();
    void clearScore(memberId, instrumentId);
  };

  // Mouse-button right-click on the cell wrapper also clears — Safari
  // dispatches `contextmenu` reliably; the wrapper guard catches
  // touch-and-hold patterns that fire `auxclick` instead.
  const handleAuxClick = (
    event: React.MouseEvent<HTMLTableCellElement>,
    memberId: string,
    instrumentId: string,
  ): void => {
    if (event.button !== RIGHT_BUTTON) return;
    event.preventDefault();
    void clearScore(memberId, instrumentId);
  };

  return (
    <section className="mastery-matrix-wrapper" data-testid="mastery-matrix">
      <h3 className="admin-page-form-title">{t('members.masteryMatrixTitle')}</h3>
      <p className="mastery-page-subtitle">{t('members.masteryMatrixSubtitle')}</p>
      {members.length === 0 || instruments.length === 0 ? (
        <p className="admin-page-loading">{t('mastery.noData')}</p>
      ) : (
        <table className="mastery-table">
          <thead>
            <tr>
              <th />
              {instruments.map((instrument) => (
                <th key={instrument.id} className="mastery-table-instrument">
                  {instrument.name}
                </th>
              ))}
              <th className="mastery-table-avg">{t('members.rowAverage')}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const average = rowAverage(member.id, instrumentIds, scores);
              return (
                <tr key={member.id}>
                  <th scope="row">
                    <span
                      className="member-chip"
                      style={{
                        background: member.color,
                        color: readableForeground(member.color),
                      }}
                    >
                      {member.firstName.slice(0, 1).toUpperCase()}
                    </span>
                    {member.firstName}
                  </th>
                  {instruments.map((instrument) => {
                    const value = scores[cellKey(member.id, instrument.id)] ?? 0;
                    return (
                      <td
                        key={instrument.id}
                        className="mastery-table-cell"
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
                            void writeScore(member.id, instrument.id, parsed);
                          }}
                          className="mastery-table-input"
                        />
                      </td>
                    );
                  })}
                  <td className="mastery-table-avg">
                    {average === null ? '—' : average.toFixed(1)}
                  </td>
                </tr>
              );
            })}
            <tr className="mastery-table-footer">
              <th scope="row">{t('members.columnAverage')}</th>
              {instruments.map((instrument) => {
                const average = columnAverage(instrument.id, memberIds, scores);
                return (
                  <td key={instrument.id} className="mastery-table-avg">
                    {average === null ? '—' : average.toFixed(1)}
                  </td>
                );
              })}
              <td className="mastery-table-avg" />
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}

