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
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import { PageHeader } from '../../components/molecules/PageHeader';
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
    <section className="px-9 py-7 pb-20 max-w-[1280px] flex flex-col gap-6">
      <PageHeader title={t('members.title')} subtitle={t('members.subtitle')} />
      {error !== null ? (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-5 items-start">
        <ul className="flex flex-col gap-1.5" aria-label={t('members.title')}>
          {loading ? (
            <li className="text-ink-400 italic text-sm">{t('common.loading')}</li>
          ) : null}
          {sortedMembers.map((member) => (
            <li
              key={member.id}
              className="flex items-center gap-3 bg-bg-elev border border-line rounded-md px-3 py-2 hover:border-line-strong transition-colors"
            >
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold"
                style={{ background: member.color, color: readableForeground(member.color) }}
                aria-hidden="true"
              >
                {member.firstName.slice(0, 1).toUpperCase()}
              </span>
              <button
                type="button"
                className="flex-1 text-left text-[13.5px] text-ink-900 cursor-pointer bg-transparent border-0"
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
                className="text-ink-400 hover:text-danger text-lg leading-none cursor-pointer bg-transparent border-0 px-1"
                onClick={() => void remove(member.id)}
                aria-label={t('common.delete')}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <Card>
          <h3 className="font-display italic text-2xl text-ink-900 m-0 mb-3">
            {draft.id === null ? t('members.newTitle') : t('members.editTitle')}
          </h3>
          <form onSubmit={submit} className="flex flex-col gap-2.5">
            <label
              className="text-[11px] tracking-wider uppercase text-ink-400 font-medium"
              htmlFor="member-first-name"
            >
              {t('members.firstName')}
            </label>
            <Input
              id="member-first-name"
              type="text"
              value={draft.firstName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, firstName: event.target.value }))
              }
              required
              minLength={1}
              maxLength={64}
            />
            <label
              className="text-[11px] tracking-wider uppercase text-ink-400 font-medium"
              htmlFor="member-color"
            >
              {t('members.color')}
            </label>
            <input
              id="member-color"
              type="color"
              value={draft.color}
              onChange={(event) =>
                setDraft((current) => ({ ...current, color: event.target.value }))
              }
              className="w-full h-10 rounded-md bg-bg-elev border border-line cursor-pointer"
            />
            {draft.id !== null ? (
              <fieldset className="border border-line rounded-md p-3 mt-2">
                <legend className="text-[11px] tracking-wider uppercase text-ink-400 px-2">
                  {t('members.instrumentsAssigned')}
                </legend>
                {instruments.length === 0 ? (
                  <p className="text-xs italic text-ink-400">{t('members.noInstrumentsYet')}</p>
                ) : null}
                <div className="flex flex-col gap-1.5">
                  {instruments
                    .toSorted((left, right) => left.name.localeCompare(right.name))
                    .map((instrument) => {
                      const assigned = (assignedByMember[draft.id ?? ''] ?? []).includes(
                        instrument.id,
                      );
                      return (
                        <label
                          key={instrument.id}
                          className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer"
                        >
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
                </div>
              </fieldset>
            ) : null}
            <div className="flex gap-2 mt-2">
              <Button type="submit" variant="accent">
                {t('common.save')}
              </Button>
              {draft.id !== null ? (
                <Button type="button" variant="ghost" onClick={() => setDraft(BLANK_DRAFT)}>
                  {t('common.cancel')}
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
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
