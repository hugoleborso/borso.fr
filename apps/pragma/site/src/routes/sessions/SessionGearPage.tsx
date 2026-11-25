/** @Feature sessions */

import { nextGearHoldingAfterTap } from '@domain/gear-status.core';
import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { BottomActions } from '../../components/atoms/BottomActions';
import { Button } from '../../components/atoms/Button';
import { Chip } from '../../components/atoms/Chip';
import { Icon } from '../../components/atoms/Icon';
import { EmptyState } from '../../components/molecules/EmptyState';
import { ListRow } from '../../components/molecules/ListRow';
import { MemberChip } from '../../components/molecules/MemberChip';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { PageHeader } from '../../components/molecules/PageHeader';
import { type GearItemDraft, GearItemSheet } from '../../components/organisms/GearItemSheet';
import { formatSessionDate } from '../../lib/formatters.utils';
import {
  type GearItemRecord,
  useCopyGearItems,
  useCreateGearItem,
  useDeleteGearItem,
  useGearChecklist,
  useUpdateGearItem,
} from '../../lib/queries/gear-items.queries';
import { type ListedMember, useMembersList } from '../../lib/queries/members.queries';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { useSession } from '../../lib/queries/sessions.queries';
import { useSessionLabel } from '../../lib/session-label.hook';
import {
  ALL_GEAR_FILTER,
  GEAR_STATUS_ICON,
  GEAR_STATUS_LABEL_KEY,
  type GearFilter,
  selectGearFilterChips,
  selectGearPageView,
  selectOfferedCopySource,
} from './gear-page.core';
import { selectMissingSessionMessageKey } from './missing-session.core';

const NO_MEMBERS: readonly ListedMember[] = [];

function toDraft(item: GearItemRecord): GearItemDraft {
  return { label: item.label, holding: { status: item.status, memberId: item.memberId } };
}

function HolderMark({
  item,
  members,
}: {
  readonly item: GearItemRecord;
  readonly members: readonly ListedMember[];
}): JSX.Element {
  const holder = members.find((member) => member.id === item.memberId);
  if (holder === undefined) return <Icon name={GEAR_STATUS_ICON[item.status]} size="lg" />;
  return <MemberChip memberName={holder.firstName} memberColor={holder.color} size="md" />;
}

// @FollowsBlueprint route-detail-page
export function SessionGearPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const labelOf = useSessionLabel();
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const isParamPresent = sessionId.length > 0;
  const sessionQuery = useSession(sessionId, isParamPresent);
  const checklistQuery = useGearChecklist(sessionId, isParamPresent);
  const members = useMembersList().data?.members ?? NO_MEMBERS;
  const signedInMemberId = useSignedInMember().data?.memberId ?? null;
  const createItem = useCreateGearItem();
  const updateItem = useUpdateGearItem();
  const deleteItem = useDeleteGearItem();
  const copyItems = useCopyGearItems();
  const [filter, setFilter] = useState<GearFilter>(ALL_GEAR_FILTER);
  const [isMineOnly, setIsMineOnly] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editedItem, setEditedItem] = useState<GearItemRecord | null>(null);
  const [isWriteFailed, setIsWriteFailed] = useState(false);

  const session = sessionQuery.data?.session ?? null;
  const checklist = checklistQuery.data ?? null;
  if (sessionQuery.isLoading || checklistQuery.isLoading) {
    return (
      <p className="px-4 sm:px-9 py-4 sm:py-7 text-ink-soft italic text-meta">
        {t('common.loading')}
      </p>
    );
  }
  if (session === null || checklist === null) {
    return (
      <NotFoundNotice
        message={t(selectMissingSessionMessageKey(sessionQuery.error ?? checklistQuery.error))}
        backTo="/sessions"
        backLabel={t('sessions.title')}
      />
    );
  }

  const gearItems = checklist.items;
  const view = selectGearPageView(gearItems, { filter, isMineOnly, memberId: signedInMemberId });
  const chips = selectGearFilterChips(view.counts, filter);
  const signedInMember = members.find((member) => member.id === signedInMemberId);
  const copySource = selectOfferedCopySource(gearItems.length, checklist.copySource);
  const reportFailure = (): void => setIsWriteFailed(true);

  const openSheet = (item: GearItemRecord | null): void => {
    setEditedItem(item);
    setIsSheetOpen(true);
  };

  const cycleHolding = (item: GearItemRecord, tappingMemberId: string): void => {
    setIsWriteFailed(false);
    updateItem.mutate(
      { sessionId, id: item.id, ...nextGearHoldingAfterTap(item.status, tappingMemberId) },
      { onError: reportFailure },
    );
  };

  const saveDraft = async (draft: GearItemDraft): Promise<void> => {
    setIsWriteFailed(false);
    const written = { sessionId, label: draft.label, ...draft.holding };
    await (editedItem === null
      ? createItem.mutateAsync({ ...written, id: crypto.randomUUID() })
      : updateItem.mutateAsync({ ...written, id: editedItem.id }));
    setIsSheetOpen(false);
  };

  const removeEditedItem =
    editedItem === null
      ? null
      : async (): Promise<void> => {
          setIsWriteFailed(false);
          await deleteItem.mutateAsync({ sessionId, id: editedItem.id });
          setIsSheetOpen(false);
        };

  return (
    <section className="flex max-w-[960px] flex-col gap-3 px-4 py-4 sm:px-9 sm:py-7">
      <PageHeader
        back={{ to: `/sessions/${session.id}?view=details`, label: labelOf(session) }}
        title={t('gear.title')}
        className="mb-0 sm:mb-0"
      />
      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map((chip) => (
          <Chip
            key={chip.filter}
            pressed={chip.isPressed}
            onPress={() => setFilter(chip.filter)}
            aria-label={t(chip.labelKey)}
          >
            {chip.icon === null ? (
              <span>{t(chip.labelKey)}</span>
            ) : (
              <Icon name={chip.icon} size="md" />
            )}
            <span className="font-mono tabular-nums">{chip.count}</span>
          </Chip>
        ))}
        {signedInMember === undefined ? null : (
          <Chip
            pressed={isMineOnly}
            onPress={() => setIsMineOnly(!isMineOnly)}
            aria-label={t('gear.mineLabel')}
            className="ml-auto pl-1.5"
          >
            <MemberChip
              memberName={signedInMember.firstName}
              memberColor={signedInMember.color}
              size="md"
            />
            <span>{t('gear.mine')}</span>
          </Chip>
        )}
      </div>
      {isWriteFailed ? (
        <p className="m-0 text-meta text-danger" role="alert">
          {t('gear.writeFailed')}
        </p>
      ) : null}
      {gearItems.length === 0 ? (
        <EmptyState
          icon="clipboard"
          action={
            copySource === null ? null : (
              <Button
                variant="secondary"
                icon="copy"
                disabled={copyItems.isPending}
                onClick={() =>
                  copyItems.mutate(
                    { sessionId, fromSessionId: copySource.sessionId },
                    { onError: reportFailure },
                  )
                }
              >
                {t('gear.copy', {
                  source: copySource.venue ?? formatSessionDate(copySource.date, i18n.language),
                  count: copySource.itemCount,
                })}
              </Button>
            )
          }
        >
          {t('gear.empty')}
        </EmptyState>
      ) : null}
      {view.sections.map((section) => (
        <section key={section.status} className="flex flex-col gap-1.5">
          <h2 className="m-0 flex items-center gap-2 py-1 text-label font-medium tracking-wider uppercase text-ink-soft">
            <span>{t(GEAR_STATUS_LABEL_KEY[section.status])}</span>
            <span className="ml-auto font-mono">{section.items.length}</span>
          </h2>
          <ul className="m-0 list-none overflow-hidden rounded-lg border border-rule bg-surface p-0">
            {section.items.map((item) => (
              <li
                key={item.id}
                className="flex min-h-13 items-center gap-2.5 border-t border-rule pr-3 pl-1 first:border-t-0"
              >
                <ListRow
                  isChevronShown={false}
                  aria-label={t('gear.cycle', { label: item.label })}
                  disabled={signedInMemberId === null}
                  onClick={() => {
                    if (signedInMemberId !== null) cycleHolding(item, signedInMemberId);
                  }}
                  className="size-11 w-11 shrink-0 justify-center gap-0 rounded-pill text-ink-soft"
                >
                  <HolderMark item={item} members={members} />
                </ListRow>
                <ListRow
                  isChevronShown={false}
                  aria-label={t('gear.edit', { label: item.label })}
                  onClick={() => openSheet(item)}
                  className="min-w-0 flex-1 text-body"
                >
                  {item.label}
                </ListRow>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <BottomActions>
        <Button variant="primary" size="lg" icon="plus" onClick={() => openSheet(null)}>
          {t('gear.add')}
        </Button>
      </BottomActions>
      {isSheetOpen ? (
        <GearItemSheet
          members={members}
          initial={editedItem === null ? null : toDraft(editedItem)}
          onSave={saveDraft}
          onDelete={removeEditedItem}
          onClose={() => setIsSheetOpen(false)}
        />
      ) : null}
    </section>
  );
}
