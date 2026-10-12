import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { PageTitle } from '../atoms/PageTitle';
import { BackLink } from '../molecules/BackLink';
import { DraftRow } from '../molecules/DraftRow';
import { EmptyState } from '../molecules/EmptyState';
import { QueryState } from '../molecules/QueryState';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { useDraftActions } from '../../lib/draft-actions.hook';
import { useDrafts } from '../../lib/queries/drafts.queries';
import {
  describeRecipients,
  partitionDrafts,
  selectChannelAppearance,
  selectDraftStatusAppearance,
  summarizeDraftBody,
} from './draft-board.core';

interface ListedDraft {
  readonly slug: string;
  readonly channel: string;
  readonly recipients: readonly { readonly name: string }[];
  readonly subject?: string;
  readonly link?: string;
  readonly status: string;
  readonly body: string;
}

// @FollowsBlueprint organism-query-owning
export function DraftBoard(): JSX.Element {
  const { t } = useTranslation();
  const drafts = useDrafts();
  const actions = useDraftActions();
  const { ready, settled } = partitionDrafts(drafts.data?.items ?? []);
  const renderRow = (draft: ListedDraft, isStatusShown: boolean): JSX.Element => {
    const channel = selectChannelAppearance(draft.channel);
    const status = selectDraftStatusAppearance(draft.status);
    const recipients = describeRecipients(draft.recipients);
    return (
      <DraftRow
        key={draft.slug}
        href={`/drafts/${draft.slug}`}
        channelIcon={channel.icon}
        channelLabel={t(channel.labelKey)}
        recipients={recipients}
        {...(draft.subject === undefined ? {} : { subject: draft.subject })}
        preview={summarizeDraftBody(draft.body)}
        {...(isStatusShown ? { status: { label: t(status.labelKey), tone: status.tone } } : {})}
        onLongPress={() => {
          openActionSheet({
            title: draft.subject ?? recipients,
            subject: { kind: 'draft', slug: draft.slug },
            actions: actions.selectSheetActions(draft),
          });
        }}
      />
    );
  };
  return (
    <>
      <BackLink to="/" label={t('common.back')} />
      <PageTitle subtitle={String(ready.length)}>{t('drafts.title')}</PageTitle>
      {drafts.data === undefined ? (
        <QueryState isPending={drafts.isPending} onRetry={() => void drafts.refetch()} />
      ) : (
        <div className="flex flex-col gap-4">
          <Card padding="none" className="px-1">
            <ul className="m-0 p-0 list-none">{ready.map((draft) => renderRow(draft, false))}</ul>
            {ready.length === 0 ? <EmptyState icon="draft" label={t('drafts.empty')} /> : null}
          </Card>
          {settled.length === 0 ? null : (
            <details className="group rounded-lg border border-line bg-surface">
              <summary className="flex items-center justify-between gap-2 min-h-13 px-4 cursor-pointer list-none text-body-sm font-semibold text-ink-soft">
                {t('drafts.history', { count: settled.length })}
                <Icon
                  name="chevron"
                  size={16}
                  className="transition-transform group-open:rotate-90"
                />
              </summary>
              <ul className="m-0 px-1 pb-1 list-none">
                {settled.map((draft) => renderRow(draft, true))}
              </ul>
            </details>
          )}
        </div>
      )}
    </>
  );
}
