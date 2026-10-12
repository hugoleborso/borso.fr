import { isDraftReady } from '@domain/draft-status.core';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { buttonVariants } from '../atoms/button.variants';
import { Card } from '../atoms/Card';
import { Chip } from '../atoms/Chip';
import { Icon } from '../atoms/Icon';
import { BackLink } from '../molecules/BackLink';
import { EmptyState } from '../molecules/EmptyState';
import { QueryState } from '../molecules/QueryState';
import { DISPLAY_LOCALE, formatShortDay } from '../../lib/calendar-day.utils';
import { useDraftActions } from '../../lib/draft-actions.hook';
import { useDrafts } from '../../lib/queries/drafts.queries';
import { buildPageHref } from '../../lib/wikilinks.core';
import {
  findDraft,
  selectChannelAppearance,
  selectDraftStatusAppearance,
} from './draft-board.core';

const DRAFTS_PATH = '/drafts';

export interface DraftViewProps {
  readonly slug: string;
}

// @FollowsBlueprint organism-query-owning
export function DraftView({ slug }: DraftViewProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const drafts = useDrafts();
  const actions = useDraftActions();
  const draft = findDraft(drafts.data?.items ?? [], slug);
  if (drafts.data === undefined) {
    return (
      <>
        <BackLink to={DRAFTS_PATH} label={t('common.back')} />
        <QueryState isPending={drafts.isPending} onRetry={() => void drafts.refetch()} />
      </>
    );
  }
  if (draft === null) {
    return (
      <>
        <BackLink to={DRAFTS_PATH} label={t('common.back')} />
        <EmptyState icon="draft" label={t('drafts.not-found')} />
      </>
    );
  }
  const channel = selectChannelAppearance(draft.channel);
  const status = selectDraftStatusAppearance(draft.status);
  const isReady = isDraftReady(draft.status);
  return (
    <article className="pb-4">
      <BackLink to={DRAFTS_PATH} label={t('common.back')} />
      <div className="flex flex-wrap items-center gap-1.5 mt-2 mb-3">
        <Chip tone="patina">
          <Icon name={channel.icon} size={13} />
          {t(channel.labelKey)}
        </Chip>
        {draft.recipients.map((recipient) =>
          recipient.page === undefined ? (
            <Chip key={recipient.name} tone="neutral">
              {recipient.name}
            </Chip>
          ) : (
            <Link
              key={recipient.name}
              to={buildPageHref(recipient.page)}
              className="inline-flex items-center min-h-11 no-underline"
            >
              <Chip tone="bronze">{recipient.name}</Chip>
            </Link>
          ),
        )}
        <Chip tone={status.tone}>
          {t(status.labelKey)}
          {draft.sentOn === undefined ? null : ` · ${formatShortDay(draft.sentOn, DISPLAY_LOCALE)}`}
        </Chip>
      </div>
      {draft.subject === undefined ? null : (
        <h1 className="m-0 mb-3 font-display text-display text-ink break-words">{draft.subject}</h1>
      )}
      <Card padding="lg">
        <p className="m-0 whitespace-pre-wrap break-words text-body leading-[26px] text-ink">
          {draft.body}
        </p>
      </Card>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Button variant="primary" onClick={() => actions.copy(draft.body)}>
          <Icon name="copy" size={18} />
          {t('drafts.copy')}
        </Button>
        {draft.link === undefined ? null : (
          <a
            href={draft.link}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'secondary' })}
          >
            <Icon name="open" size={18} />
            {t('drafts.open-link')}
          </a>
        )}
        {isReady ? (
          <>
            <Button
              disabled={actions.isWriting}
              onClick={() => {
                actions.markSent(slug);
                void navigate(DRAFTS_PATH);
              }}
            >
              <Icon name="sent" size={18} />
              {t('drafts.sent')}
            </Button>
            <Button
              variant="quiet"
              disabled={actions.isWriting}
              onClick={() => {
                actions.abandon(slug);
                void navigate(DRAFTS_PATH);
              }}
            >
              <Icon name="abandon" size={18} />
              {t('drafts.abandon')}
            </Button>
          </>
        ) : null}
      </div>
    </article>
  );
}
