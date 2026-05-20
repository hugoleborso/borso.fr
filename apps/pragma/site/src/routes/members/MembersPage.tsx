/**
 * Members admin page. List on the left (with the member's color chip
 * applied per the design bundle), an edit form on the right, and a
 * sub-panel for assigning instruments to the selected member.
 *
 * Color values are entered as hex (`#rrggbb`); the contrast helper in
 * `member-color.utils.ts` picks the readable foreground for each chip
 * at render time.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { MasteryMatrix } from '../../components/organisms/MasteryMatrix';
import { ApiError, apiRequest } from '../../lib/api-client';
import { cellKey } from '../../lib/mastery-matrix.utils';
import { readableForeground } from '../../lib/member-color.utils';

const memberSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  color: z.string(),
  avatarS3Key: z.string().nullable(),
});
const memberListSchema = z.object({ members: z.array(memberSchema) });
const singleMemberSchema = z.object({ member: memberSchema });

const instrumentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isHarmonic: z.boolean(),
});
const instrumentListSchema = z.object({ instruments: z.array(instrumentSchema) });

const masteryDefaultSchema = z.object({
  memberId: z.string().uuid(),
  instrumentId: z.string().uuid(),
  score: z.number().int().min(0).max(10),
});
const masteryDefaultListSchema = z.object({ defaults: z.array(masteryDefaultSchema) });

type Member = z.infer<typeof memberSchema>;
type Instrument = z.infer<typeof instrumentSchema>;

interface DraftState {
  id: string | null;
  firstName: string;
  color: string;
}

const BLANK_DRAFT: DraftState = { id: null, firstName: '', color: '#2d5fa0' };

export function MembersPage(): JSX.Element {
  const { t } = useTranslation();
  const [members, setMembers] = useState<Member[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [assignedByMember, setAssignedByMember] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState<DraftState>(BLANK_DRAFT);
  const [masteryScores, setMasteryScores] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [membersBody, instrumentsBody, masteryBody] = await Promise.all([
        apiRequest('/api/members').then((body) => memberListSchema.parse(body)),
        apiRequest('/api/instruments').then((body) => instrumentListSchema.parse(body)),
        apiRequest('/api/mastery/defaults').then((body) => masteryDefaultListSchema.parse(body)),
      ]);
      setMembers(membersBody.members);
      setInstruments(instrumentsBody.instruments);
      const nextScores: Record<string, number> = {};
      for (const row of masteryBody.defaults) {
        nextScores[cellKey(row.memberId, row.instrumentId)] = row.score;
      }
      setMasteryScores(nextScores);
      const assignments: Record<string, string[]> = {};
      await Promise.all(
        membersBody.members.map(async (member) => {
          const body = instrumentListSchema.parse(
            await apiRequest(`/api/members/${member.id}/instruments`),
          );
          assignments[member.id] = body.instruments.map((row) => row.id);
        }),
      );
      setAssignedByMember(assignments);
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

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmed = draft.firstName.trim();
    if (trimmed.length === 0) return;
    try {
      if (draft.id === null) {
        const created = singleMemberSchema.parse(
          await apiRequest('/api/members', {
            method: 'POST',
            body: { firstName: trimmed, color: draft.color },
          }),
        );
        setMembers((current) => [...current, created.member]);
      } else {
        const updated = singleMemberSchema.parse(
          await apiRequest(`/api/members/${draft.id}`, {
            method: 'PUT',
            body: { firstName: trimmed, color: draft.color },
          }),
        );
        setMembers((current) =>
          current.map((row) => (row.id === updated.member.id ? updated.member : row)),
        );
      }
      setDraft(BLANK_DRAFT);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  const remove = async (id: string): Promise<void> => {
    try {
      await apiRequest(`/api/members/${id}`, { method: 'DELETE' });
      setMembers((current) => current.filter((row) => row.id !== id));
      if (draft.id === id) setDraft(BLANK_DRAFT);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  const toggleInstrument = async (memberId: string, instrumentId: string): Promise<void> => {
    const current = assignedByMember[memberId] ?? [];
    const nextSet = current.includes(instrumentId)
      ? current.filter((id) => id !== instrumentId)
      : [...current, instrumentId];
    try {
      await apiRequest(`/api/members/${memberId}/instruments`, {
        method: 'PUT',
        body: { instrumentIds: nextSet },
      });
      setAssignedByMember((existing) => ({ ...existing, [memberId]: nextSet }));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  return (
    <section className="admin-page">
      <h2 className="admin-page-title">{t('members.title')}</h2>
      {error !== null ? <p className="admin-page-error">{error}</p> : null}
      <div className="admin-page-layout">
        <ul className="admin-page-list" aria-label={t('members.title')}>
          {loading ? <li className="admin-page-loading">{t('common.loading')}</li> : null}
          {sortedMembers.map((member) => (
            <li key={member.id} className="admin-page-row">
              <span
                className="member-chip"
                style={{ background: member.color, color: readableForeground(member.color) }}
                aria-hidden="true"
              >
                {member.firstName.slice(0, 1).toUpperCase()}
              </span>
              <button
                type="button"
                className="admin-page-row-name"
                onClick={() =>
                  setDraft({
                    id: member.id,
                    firstName: member.firstName,
                    color: member.color,
                  })
                }
              >
                {member.firstName}
              </button>
              <button
                type="button"
                className="admin-page-row-delete"
                onClick={() => void remove(member.id)}
                aria-label={t('common.delete')}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={submit} className="admin-page-form">
          <h3 className="admin-page-form-title">
            {draft.id === null ? t('members.newTitle') : t('members.editTitle')}
          </h3>
          <label className="admin-page-form-label" htmlFor="member-first-name">
            {t('members.firstName')}
          </label>
          <input
            id="member-first-name"
            type="text"
            value={draft.firstName}
            onChange={(event) =>
              setDraft((current) => ({ ...current, firstName: event.target.value }))
            }
            className="admin-page-form-input"
            required
            minLength={1}
            maxLength={64}
          />
          <label className="admin-page-form-label" htmlFor="member-color">
            {t('members.color')}
          </label>
          <input
            id="member-color"
            type="color"
            value={draft.color}
            onChange={(event) =>
              setDraft((current) => ({ ...current, color: event.target.value }))
            }
            className="admin-page-form-input"
          />
          {draft.id !== null ? (
            <fieldset className="admin-page-form-fieldset">
              <legend>{t('members.instrumentsAssigned')}</legend>
              {instruments.length === 0 ? (
                <p className="admin-page-form-hint">{t('members.noInstrumentsYet')}</p>
              ) : null}
              {instruments
                .toSorted((left, right) => left.name.localeCompare(right.name))
                .map((instrument) => {
                  const assigned = (assignedByMember[draft.id ?? ''] ?? []).includes(instrument.id);
                  return (
                    <label key={instrument.id} className="admin-page-form-checkbox">
                      <input
                        type="checkbox"
                        checked={assigned}
                        onChange={() => {
                          if (draft.id !== null) {
                            void toggleInstrument(draft.id, instrument.id);
                          }
                        }}
                      />
                      {instrument.name}
                    </label>
                  );
                })}
            </fieldset>
          ) : null}
          <div className="admin-page-form-actions">
            <button type="submit" className="admin-page-form-submit">
              {t('common.save')}
            </button>
            {draft.id !== null ? (
              <button
                type="button"
                className="admin-page-form-cancel"
                onClick={() => setDraft(BLANK_DRAFT)}
              >
                {t('common.cancel')}
              </button>
            ) : null}
          </div>
        </form>
      </div>
      <MasteryMatrix
        members={sortedMembers}
        instruments={instruments.toSorted((left, right) => left.name.localeCompare(right.name))}
        scores={masteryScores}
        onScoresChange={setMasteryScores}
        onError={setError}
      />
    </section>
  );
}
