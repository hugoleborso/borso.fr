/** @Feature members */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../components/atoms/Avatar';
import { IconButton } from '../../components/atoms/IconButton';
import { memberInitial } from '../../components/atoms/member-palette.utils';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { ListRow } from '../../components/molecules/ListRow';
import { PageHeader } from '../../components/molecules/PageHeader';
import { MasteryMatrix } from '../../components/organisms/MasteryMatrix';
import { ApiError } from '../../lib/api.client';
import { useInstrumentsList } from '../../lib/queries/instruments.queries';
import {
  useAssignMemberInstruments,
  useCreateMember,
  useDeleteMember,
  useMemberInstruments,
  useMembersList,
  useUpdateMember,
} from '../../lib/queries/members.queries';
import { MemberEditForm } from '../../components/organisms/MemberEditForm';
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

// @FollowsBlueprint route-list-page
export function MembersPage(): JSX.Element {
  const { t } = useTranslation();
  const membersQuery = useMembersList();
  const instrumentsQuery = useInstrumentsList();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  const assignInstruments = useAssignMemberInstruments();
  const [selected, setSelected] = useState<MemberSelection | null>(null);
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);
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
    <section className="px-4 sm:px-9 py-4 sm:py-7 pb-20 max-w-[1280px] flex flex-col gap-6">
      <PageHeader title={t('members.title')} />
      {firstError === null ? null : (
        <p className="text-danger text-meta" role="alert">
          {firstError}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-5 items-start">
        <ul className="flex flex-col gap-1.5" aria-label={t('members.title')}>
          {membersQuery.isLoading ? (
            <li className="text-ink-soft italic text-meta">{t('common.loading')}</li>
          ) : null}
          {sortedMembers.map((member) => (
            <li
              key={member.id}
              className="flex items-center gap-3 rounded-md bg-leaf px-3 py-2 shadow-leaf transition-colors hover:bg-hover"
            >
              <ListRow
                className="flex-1 text-body"
                leading={
                  <Avatar
                    size="md"
                    aria-hidden="true"
                    initials={memberInitial(member.firstName)}
                    color={member.color}
                  />
                }
                onClick={() =>
                  setSelected({
                    id: member.id,
                    firstName: member.firstName,
                    color: member.color,
                  })
                }
              >
                {member.firstName}
              </ListRow>
              <IconButton
                variant="danger"
                icon="trash"
                label={t('common.delete')}
                onClick={() => setPendingDeletionId(member.id)}
              />
            </li>
          ))}
        </ul>
        <MemberEditForm
          key={buildMemberFormKey(selected)}
          mode={selectMemberFormMode(selected)}
          initialValues={buildMemberFormValues(
            selected,
            sortedMembers.map((member) => member.color),
          )}
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
      {pendingDeletionId === null ? null : (
        <ConfirmDialog
          question={t('members.deleteConfirm')}
          confirmLabel={t('common.delete')}
          onConfirm={() => {
            removeMember(pendingDeletionId);
            setPendingDeletionId(null);
          }}
          onCancel={() => setPendingDeletionId(null)}
        />
      )}
    </section>
  );
}
