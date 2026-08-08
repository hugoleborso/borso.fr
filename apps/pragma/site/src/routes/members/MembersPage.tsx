/**
 * Members admin page. List on the left (with the member's color chip
 * applied per the design bundle), an edit form on the right, and a
 * sub-panel for assigning instruments to the selected member.
 *
 * Color values are entered as hex (`#rrggbb`); the contrast helper in
 * `member-color.utils.ts` picks the readable foreground for each chip
 * at render time.
 */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import { PageHeader } from '../../components/molecules/PageHeader';
import { MasteryMatrix } from '../../components/organisms/MasteryMatrix';
import { ApiError } from '../../lib/api';
import { readableForeground } from '../../lib/member-color.utils';
import { useInstrumentsList } from '../../lib/queries/instruments';
import {
  useAssignMemberInstruments,
  useCreateMember,
  useDeleteMember,
  useMemberInstruments,
  useMembersList,
  useUpdateMember,
} from '../../lib/queries/members';

interface Selection {
  id: string;
  firstName: string;
  color: string;
}

const DEFAULT_COLOR = '#2d5fa0';

export function MembersPage(): JSX.Element {
  const { t } = useTranslation();
  const membersQuery = useMembersList();
  const instrumentsQuery = useInstrumentsList();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  const assignInstruments = useAssignMemberInstruments();
  const [selected, setSelected] = useState<Selection | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const selectedInstruments = useMemberInstruments(selected?.id ?? '', selected !== null);

  const members = membersQuery.data?.members ?? [];
  const instruments = instrumentsQuery.data?.instruments ?? [];

  const form = useForm({
    defaultValues: { firstName: '', color: DEFAULT_COLOR },
    onSubmit: async ({ value }) => {
      const trimmed = value.firstName.trim();
      if (trimmed.length === 0) return;
      try {
        if (selected === null) {
          await createMember.mutateAsync({ firstName: trimmed, color: value.color });
        } else {
          await updateMember.mutateAsync({
            id: selected.id,
            firstName: trimmed,
            color: value.color,
          });
        }
        setSelected(null);
        form.reset();
      } catch (error) {
        setLocalError(error instanceof ApiError ? error.message : 'unknown-error');
      }
    },
  });

  useEffect(() => {
    form.setFieldValue('firstName', selected?.firstName ?? '');
    form.setFieldValue('color', selected?.color ?? DEFAULT_COLOR);
  }, [selected, form]);

  const sortedMembers = useMemo(
    () => members.toSorted((left, right) => left.firstName.localeCompare(right.firstName)),
    [members],
  );

  const assignedIds = selectedInstruments.data?.instruments.map((row) => row.id) ?? [];

  const firstError =
    localError ??
    (membersQuery.error instanceof ApiError ? membersQuery.error.message : null) ??
    (instrumentsQuery.error instanceof ApiError ? instrumentsQuery.error.message : null);

  const toggleInstrument = (instrumentId: string): void => {
    if (selected === null) return;
    const next = assignedIds.includes(instrumentId)
      ? assignedIds.filter((id) => id !== instrumentId)
      : [...assignedIds, instrumentId];
    assignInstruments.mutate({ memberId: selected.id, instrumentIds: next });
  };

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px] flex flex-col gap-6">
      <PageHeader title={t('members.title')} subtitle={t('members.subtitle')} />
      {firstError === null ? null : (
        <p className="text-danger text-sm" role="alert">
          {firstError}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-5 items-start">
        <ul className="flex flex-col gap-1.5" aria-label={t('members.title')}>
          {membersQuery.isLoading ? (
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
                  setSelected({
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
                onClick={() => {
                  deleteMember.mutate({ id: member.id });
                  if (selected?.id === member.id) {
                    setSelected(null);
                    form.reset();
                  }
                }}
                aria-label={t('common.delete')}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <Card>
          <h3 className="font-display italic text-2xl text-ink-900 m-0 mb-3">
            {selected === null ? t('members.newTitle') : t('members.editTitle')}
          </h3>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
            className="flex flex-col gap-2.5"
          >
            <label
              className="text-[11px] tracking-wider uppercase text-ink-400 font-medium"
              htmlFor="member-first-name"
            >
              {t('members.firstName')}
            </label>
            <form.Field name="firstName">
              {(field) => (
                <Input
                  id="member-first-name"
                  type="text"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  required
                  minLength={1}
                  maxLength={64}
                />
              )}
            </form.Field>
            <label
              className="text-[11px] tracking-wider uppercase text-ink-400 font-medium"
              htmlFor="member-color"
            >
              {t('members.color')}
            </label>
            <form.Field name="color">
              {(field) => (
                <input
                  id="member-color"
                  type="color"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full h-10 rounded-md bg-bg-elev border border-line cursor-pointer"
                />
              )}
            </form.Field>
            {selected === null ? null : (
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
                      const isAssigned = assignedIds.includes(instrument.id);
                      return (
                        <label
                          key={instrument.id}
                          className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => toggleInstrument(instrument.id)}
                          />
                          {instrument.name}
                        </label>
                      );
                    })}
                </div>
              </fieldset>
            )}
            <div className="flex gap-2 mt-2">
              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" variant="accent" disabled={!canSubmit || isSubmitting}>
                    {t('common.save')}
                  </Button>
                )}
              </form.Subscribe>
              {selected === null ? null : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSelected(null);
                    form.reset();
                  }}
                >
                  {t('common.cancel')}
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
      <MasteryMatrix
        members={sortedMembers}
        instruments={instruments.toSorted((left, right) => left.name.localeCompare(right.name))}
        onError={setLocalError}
      />
    </section>
  );
}
