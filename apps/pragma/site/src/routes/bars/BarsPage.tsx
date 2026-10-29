import { BAR_STATUSES, type BarStatus, type ConcertMood } from '@domain/bar-profile.core';
/** @Feature bars */

import type { JSX } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomActions } from '../../components/atoms/BottomActions';
import { Button } from '../../components/atoms/Button';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { PageHeader } from '../../components/molecules/PageHeader';
import { SectionTabs } from '../../components/molecules/SectionTabs';
import {
  BREAKPOINT_BELOW_LG,
  useIsMediaQueryMatching,
} from '../../components/molecules/media-query-matching.hook';
import { BarsKanban } from '../../components/organisms/BarsKanban';
import { BarsList, type BarsListRow } from '../../components/organisms/BarsList';
import { ApiError } from '../../lib/api.client';
import { didCopyTextToClipboard } from '../../lib/clipboard.adapter';
import { useMembersList } from '../../lib/queries/members.queries';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { useOutreachTemplate } from '../../lib/queries/outreach.queries';
import { BarPlaceSearch } from '../../components/organisms/BarPlaceSearch';
import { OutreachTemplateAction } from '../../components/organisms/OutreachTemplateAction';
import { renderOutreachMessage, selectOutreachTemplate } from './outreach-message.core';
import {
  useBarsList,
  useCreateBar,
  useDeleteBar,
  useUpdateBar,
} from '../../lib/queries/bars.queries';
import { BarForm, type BarOwnerOption } from '../../components/organisms/BarForm';
import {
  BAR_STATUS_KEY,
  CONCERT_MOOD_KEY,
  type BarFormInitial,
  type BarFormSubmitPayload,
  BLANK_BAR_FORM,
  buildBarFormFromPlace,
} from './bar-form.core';
import {
  applyBarWriteIntent,
  type BarRow,
  buildBarFormKey,
  type BarsView,
  buildKanbanCardsByStatus,
  groupBarsByStatus,
  isBarBeingEdited,
  selectBarWriteIntent,
  selectDragDropIntent,
  selectFormAfterDeletion,
  selectFormForBar,
  addMoodLabelToCards,
  selectOwnerName,
  selectVisibleBarsView,
  sortBarsByName,
} from './bars-page.core';

const NO_BARS: readonly BarRow[] = [];
const NO_OWNERS: readonly BarOwnerOption[] = [];

// @FollowsBlueprint route-list-page
export function BarsPage(): JSX.Element {
  const { t } = useTranslation();
  const [view, setView] = useState<BarsView>('list');
  const [formInitial, setFormInitial] = useState<BarFormInitial | null>(null);
  const [writeCount, setWriteCount] = useState<number>(0);
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const isNarrow = useIsMediaQueryMatching(BREAKPOINT_BELOW_LG);
  const barsQuery = useBarsList();
  const membersQuery = useMembersList();
  const signedInMember = useSignedInMember();
  const outreachTemplateQuery = useOutreachTemplate();
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const createBar = useCreateBar();
  const updateBar = useUpdateBar();
  const deleteBar = useDeleteBar();

  const bars = useMemo<readonly BarRow[]>(() => barsQuery.data?.bars ?? NO_BARS, [barsQuery.data]);
  const sortedBars = useMemo(() => sortBarsByName(bars), [bars]);
  const owners = useMemo<readonly BarOwnerOption[]>(
    () => membersQuery.data?.members ?? NO_OWNERS,
    [membersQuery.data],
  );
  const ownerNameOf = useCallback(
    (bar: BarRow): string | null => selectOwnerName(owners, bar.ownerMemberId),
    [owners],
  );

  const moodLabelOf = useCallback(
    (mood: ConcertMood | null): string | null => (mood === null ? null : t(CONCERT_MOOD_KEY[mood])),
    [t],
  );

  const grouped = useMemo(() => groupBarsByStatus(sortedBars), [sortedBars]);
  const kanbanCardsByStatus = useMemo(
    () => buildKanbanCardsByStatus(grouped, ownerNameOf),
    [grouped, ownerNameOf],
  );
  const kanbanCardsWithMood = useMemo(
    () => addMoodLabelToCards(kanbanCardsByStatus, moodLabelOf),
    [kanbanCardsByStatus, moodLabelOf],
  );

  const queryError = barsQuery.error instanceof ApiError ? barsQuery.error.message : null;
  const displayError = localError ?? queryError;

  const listRows = useMemo<BarsListRow[]>(
    () =>
      sortedBars.map((bar) => ({
        id: bar.id,
        name: bar.name,
        status: bar.status,
        city: bar.city,
        capacity: bar.capacity,
        ownerName: ownerNameOf(bar),
        moodLabel: moodLabelOf(bar.concertMood),
        isBeingEdited: isBarBeingEdited(bar.id, formInitial ?? BLANK_BAR_FORM),
      })),
    [sortedBars, ownerNameOf, moodLabelOf, formInitial],
  );

  const template = selectOutreachTemplate(
    outreachTemplateQuery.data?.body ?? null,
    t('bars.outreachDefaultTemplate'),
  );

  const copyMessageForBar = async (barName: string): Promise<void> => {
    const message = renderOutreachMessage(template, {
      barName,
      phone: signedInMember.data?.phone ?? null,
      email: signedInMember.data?.email ?? null,
    });
    const isCopied = await didCopyTextToClipboard(message);
    setCopyMessage(isCopied ? t('bars.outreachCopied') : t('bars.outreachCopyFailed'));
  };

  const reportError = (error: Error): void => {
    setLocalError(error instanceof ApiError ? error.message : 'unknown-error');
  };

  const saveBar = (id: string | null, payload: BarFormSubmitPayload): void => {
    const mutationOptions = {
      onSuccess: () => {
        setFormInitial(null);
        setWriteCount((current) => current + 1);
      },
      onError: reportError,
    };
    applyBarWriteIntent(selectBarWriteIntent(id, payload), {
      skip: (): void => undefined,
      create: (input) => createBar.mutate(input, mutationOptions),
      update: (input) => updateBar.mutate(input, mutationOptions),
    });
  };

  const removeBar = (barId: string): void => {
    deleteBar.mutate(
      { id: barId },
      {
        onSuccess: () =>
          setFormInitial((current) =>
            current === null ? null : selectFormAfterDeletion(current, barId, BLANK_BAR_FORM),
          ),
        onError: reportError,
      },
    );
  };

  const openBar = (barId: string): void => {
    setFormInitial((current) => selectFormForBar(bars, barId, current ?? BLANK_BAR_FORM));
  };

  const moveBarToStatus = (status: BarStatus, draggedId: string): void => {
    const dropByIntent = {
      ignore: (): void => undefined,
      move: (): void => updateBar.mutate({ id: draggedId, status }),
    } as const;
    dropByIntent[selectDragDropIntent(draggedId)]();
  };

  const panelByView: Readonly<Record<BarsView, JSX.Element>> = {
    list: (
      <BarsList
        bars={listRows}
        statusLabel={(status) => t(BAR_STATUS_KEY[status])}
        onSelect={openBar}
        onRemove={setPendingDeletionId}
      />
    ),
    kanban: (
      <BarsKanban
        statuses={BAR_STATUSES}
        cardsByStatus={kanbanCardsWithMood}
        statusLabel={(status) => t(BAR_STATUS_KEY[status])}
        onSelect={openBar}
        onMoveToStatus={moveBarToStatus}
      />
    ),
  };

  return (
    <section className="px-4 sm:px-9 py-4 sm:py-7 max-w-[1280px]">
      <PageHeader
        back={{ to: '/band', label: t('band.title') }}
        title={t('bars.title')}
        actions={
          <>
            <OutreachTemplateAction template={template} onError={reportError} />
            <SectionTabs
              label={t('bars.title')}
              tabs={[
                { value: 'list', label: t('bars.viewList'), icon: 'catalog' },
                { value: 'kanban', label: t('bars.viewKanban'), icon: 'bars' },
              ]}
              value={view}
              onChange={setView}
              className="hidden lg:flex"
            />
          </>
        }
      />

      {displayError === null ? null : (
        <p className="text-danger text-meta mb-3" role="alert">
          {displayError}
        </p>
      )}
      {barsQuery.isLoading ? (
        <p className="text-ink-soft italic text-meta">{t('common.loading')}</p>
      ) : null}

      {copyMessage === null ? null : <p className="text-meta text-ink-soft mb-3">{copyMessage}</p>}
      {panelByView[selectVisibleBarsView(view, isNarrow)]}
      {formInitial === null ? null : (
        <BarForm
          key={buildBarFormKey(formInitial, writeCount)}
          initial={formInitial}
          owners={owners}
          copyMessageLabel={t('bars.outreachCopy')}
          onCopyMessage={(barName) => void copyMessageForBar(barName)}
          onSubmit={saveBar}
          onCancel={() => setFormInitial(null)}
          leading={
            formInitial.id === null ? (
              <BarPlaceSearch
                onPick={(hit) => {
                  setFormInitial(buildBarFormFromPlace(hit, BLANK_BAR_FORM));
                  setWriteCount((current) => current + 1);
                }}
              />
            ) : null
          }
        />
      )}
      {pendingDeletionId === null ? null : (
        <ConfirmDialog
          question={t('bars.deleteConfirm')}
          confirmLabel={t('common.delete')}
          onConfirm={() => {
            removeBar(pendingDeletionId);
            setPendingDeletionId(null);
          }}
          onCancel={() => setPendingDeletionId(null)}
        />
      )}
      <BottomActions>
        <Button
          variant="primary"
          size="lg"
          icon="plus"
          onClick={() => setFormInitial(BLANK_BAR_FORM)}
        >
          {t('bars.newBar')}
        </Button>
      </BottomActions>
    </section>
  );
}
