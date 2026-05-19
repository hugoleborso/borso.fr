/**
 * Mastery matrix — members × instruments grid. Each cell shows the
 * default score (0..10). Click to edit. The grid is the band-wide
 * default; per-song overrides live on the song detail page.
 *
 * Edits hit `PUT /api/mastery/defaults` with `(memberId, instrumentId,
 * score)`. A score of -1 (sentinel "clear") triggers `DELETE`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ApiError, apiRequest } from '../../lib/api-client';
import { readableForeground } from '../../lib/member-color.utils';

const SCORE_MIN = 0;
const SCORE_MAX = 10;

const memberSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  color: z.string(),
  avatarS3Key: z.string().nullable(),
});
const instrumentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isHarmonic: z.boolean(),
});
const masteryDefaultSchema = z.object({
  memberId: z.string().uuid(),
  instrumentId: z.string().uuid(),
  score: z.number().int().min(SCORE_MIN).max(SCORE_MAX),
});
const memberListSchema = z.object({ members: z.array(memberSchema) });
const instrumentListSchema = z.object({ instruments: z.array(instrumentSchema) });
const masteryDefaultListSchema = z.object({ defaults: z.array(masteryDefaultSchema) });

type Member = z.infer<typeof memberSchema>;
type Instrument = z.infer<typeof instrumentSchema>;

function cellKey(memberId: string, instrumentId: string): string {
  return `${memberId}/${instrumentId}`;
}

export function MasteryPage(): JSX.Element {
  const { t } = useTranslation();
  const [members, setMembers] = useState<Member[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [m, i, d] = await Promise.all([
        apiRequest('/api/members').then((body) => memberListSchema.parse(body)),
        apiRequest('/api/instruments').then((body) => instrumentListSchema.parse(body)),
        apiRequest('/api/mastery/defaults').then((body) => masteryDefaultListSchema.parse(body)),
      ]);
      setMembers(m.members);
      setInstruments(i.instruments);
      const nextScores: Record<string, number> = {};
      for (const row of d.defaults) {
        nextScores[cellKey(row.memberId, row.instrumentId)] = row.score;
      }
      setScores(nextScores);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sortedMembers = useMemo(
    () => members.toSorted((left, right) => left.firstName.localeCompare(right.firstName)),
    [members],
  );
  const sortedInstruments = useMemo(
    () => instruments.toSorted((left, right) => left.name.localeCompare(right.name)),
    [instruments],
  );

  const updateScore = async (
    memberId: string,
    instrumentId: string,
    score: number,
  ): Promise<void> => {
    try {
      await apiRequest('/api/mastery/defaults', {
        method: 'PUT',
        body: { memberId, instrumentId, score },
      });
      setScores((current) => ({ ...current, [cellKey(memberId, instrumentId)]: score }));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  if (loading) return <p className="admin-page-loading">{t('common.loading')}</p>;

  return (
    <section className="mastery-page">
      <h2 className="admin-page-title">{t('mastery.title')}</h2>
      <p className="mastery-page-subtitle">{t('mastery.subtitle')}</p>
      {error !== null ? <p className="admin-page-error">{error}</p> : null}
      {sortedMembers.length === 0 || sortedInstruments.length === 0 ? (
        <p className="admin-page-loading">{t('mastery.noData')}</p>
      ) : (
        <table className="mastery-table">
          <thead>
            <tr>
              <th />
              {sortedInstruments.map((instrument) => (
                <th key={instrument.id} className="mastery-table-instrument">
                  {instrument.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member) => (
              <tr key={member.id}>
                <th scope="row">
                  <span
                    className="member-chip"
                    style={{ background: member.color, color: readableForeground(member.color) }}
                  >
                    {member.firstName.slice(0, 1).toUpperCase()}
                  </span>
                  {member.firstName}
                </th>
                {sortedInstruments.map((instrument) => {
                  const value = scores[cellKey(member.id, instrument.id)] ?? 0;
                  return (
                    <td key={instrument.id} className="mastery-table-cell">
                      <input
                        type="number"
                        min={SCORE_MIN}
                        max={SCORE_MAX}
                        value={value}
                        onChange={(event) =>
                          void updateScore(
                            member.id,
                            instrument.id,
                            Math.max(SCORE_MIN, Math.min(SCORE_MAX, Number(event.target.value))),
                          )
                        }
                        className="mastery-table-input"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
