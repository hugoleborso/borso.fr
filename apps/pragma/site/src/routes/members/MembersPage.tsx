/**
 * Members admin page. List on the left (with the member's color chip
 * applied per the design bundle), an edit form on the right, and the
 * mastery matrix underneath.
 *
 * Color values are entered as hex (`#rrggbb`); the contrast helper in
 * `member-color.utils.ts` picks the readable foreground for each chip
 * at render time.
 */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { MemberEditForm } from './MemberEditForm';
import {
  applyMemberWriteIntent,
  buildMemberFormKey,
  buildMemberFormValues,
  type InstrumentRow,
  type MemberFormValues,
  type MemberRow,
  type MemberSelection,
  selectMemberFormMode,
  selectMemberWriteIntent,
  selectSelectionAfterDeletion,
  sortInstrumentsByName,
  sortMembersByFirstName,
} from './members-page.core';

const NO_MEMBERS: readonly MemberRow[] = [];
const NO_INSTRUMENTS: readonly InstrumentRow[] = [];
const NO_ASSIGNED_INSTRUMENTS: readonly string[] = [];

export function MembersPage(): JSX.Element {
  const { t } = useTranslation();
  const membersQuery = useMembersList();
  const instrumentsQuery = useInstrumentsList();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  const assignInstruments = useAssignMemberInstruments();
  const [selected, setSelected] = useState<MemberSelection | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const selectedInstruments = useMemberInstruments(selected?.id ?? '', selected !== null);

  const members = useMemo<readonly MemberRow[]>(
    () => membersQuery.data?.members ?? NO_MEMBERS,
    [membersQuery.data],
  );
  const instruments = useMemo<readonly InstrumentRow[]>(
    () => instrumentsQuery.data?.instruments ?? NO_INSTRUMENTS,
    [instrumentsQuery.data],
  );
  const sortedMembers = useMemo(() => sortMembersByFirstName(members), [members]);
  const sortedInstruments = useMemo(() => sortInstrumentsByName(instruments), [instruments]);

  const assignedInstrumentIds = useMemo<readonly string[]>(
    () =>
      selectedInstruments.data?.instruments.map((instrument) => instrument.id) ??
      NO_ASSIGNED_INSTRUMENTS,
    [selectedInstruments.data],
  );

  const firstError =
    localError ??
    (membersQuery.error instanceof ApiError ? membersQuery.error.message : null) ??
    (instrumentsQuery.error instanceof ApiError ? instrumentsQuery.error.message : null);

  const reportError = (error: unknown): void => {
    setLocalError(error instanceof ApiError ? error.message : 'unknown-error');
  };

  const saveMember = (values: MemberFormValues): void => {
    const mutationOptions = {
      onSuccess: () => setSelected(null),
      onError: reportError,
    };
    applyMemberWriteIntent(selectMemberWriteIntent(selected, values), {
      skip: (): void => undefined,
      create: (input) => createMember.mutate(input, mutationOptions),
      update: (input) => updateMember.mutate(input, mutationOptions),
    });
  };

  const removeMember = (memberId: string): void => {
    deleteMember.mutate({ id: memberId });
    setSelected((current) => selectSelectionAfterDeletion(current, memberId));
  };

  const replaceAssignedInstruments = (instrumentIds: readonly string[]): void => {
    const memberId = selected?.id ?? '';
    assignInstruments.mutate({ memberId, instrumentIds: [...instrumentIds] });
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
                className="inline-flex items-center justify-center min-w-11 min-h-11 text-ink-400 hover:text-danger text-lg leading-none cursor-pointer bg-transparent border-0 px-1"
                onClick={() => removeMember(member.id)}
                aria-label={t('common.delete')}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <MemberEditForm
          key={buildMemberFormKey(selected)}
          mode={selectMemberFormMode(selected)}
          initialValues={buildMemberFormValues(selected)}
          instruments={sortedInstruments}
          assignedInstrumentIds={assignedInstrumentIds}
          onSave={saveMember}
          onCancel={() => setSelected(null)}
          onInstrumentsChanged={replaceAssignedInstruments}
        />
      </div>
      <MasteryMatrix
        members={sortedMembers}
        instruments={sortedInstruments}
        onError={setLocalError}
      />
    </section>
  );
}
