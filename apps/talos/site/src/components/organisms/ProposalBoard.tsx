import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { PageTitle } from '../atoms/PageTitle';
import { DecidedProposalRow } from '../molecules/DecidedProposalRow';
import { RevokeDecisionButton } from '../molecules/RevokeDecisionButton';
import { ProposalCard } from '../molecules/ProposalCard';
import { ProposalOutcome } from '../molecules/ProposalOutcome';
import { EmptyState } from '../molecules/EmptyState';
import { QueryState } from '../molecules/QueryState';
import { DISPLAY_LOCALE, formatShortDay } from '../../lib/calendar-day.utils';
import { renderMarkdownToSafeHtml } from '../../lib/markdown.utils';
import { isDecisionRevocable } from '@domain/proposal.core';
import {
  useCancelProposalDecision,
  useDecideProposal,
  useProposals,
} from '../../lib/queries/proposals.queries';
import { ProposalDecisionForm } from './ProposalDecisionForm';
import {
  countAwaitingDecision,
  isAcceptedOutcome,
  isAwaitingDecision,
  partitionProposals,
  selectCategoryLabelKey,
  selectPriorityLabelKey,
  selectPriorityTone,
  selectStatusLabelKey,
  selectOutcomeKey,
  selectStatusTone,
} from './proposal-board.core';

// @FollowsBlueprint organism-mutation-panel
export function ProposalBoard(): JSX.Element {
  const { t } = useTranslation();
  const proposals = useProposals();
  const decideProposal = useDecideProposal();
  const cancelDecision = useCancelProposalDecision();
  const [decidedHereSlugs, setDecidedHereSlugs] = useState<ReadonlySet<string>>(new Set());
  const { pending, decided } = partitionProposals(proposals.data ?? [], decidedHereSlugs);
  const pendingCount = countAwaitingDecision(pending);
  const keepOnBoard = (slug: string): void => {
    setDecidedHereSlugs((slugs) => new Set([...slugs, slug]));
  };
  const isWriting = decideProposal.isPending || cancelDecision.isPending;
  const renderRevokeButton = (proposal: {
    slug: string;
    status: string;
  }): JSX.Element | undefined => {
    const isRevocable = isDecisionRevocable(proposal.status);
    if (!isRevocable) return undefined;
    return (
      <RevokeDecisionButton
        label={t('proposals.revoke')}
        isDisabled={isWriting}
        onRevoke={() => {
          keepOnBoard(proposal.slug);
          cancelDecision.mutate({ slug: proposal.slug });
        }}
      />
    );
  };

  return (
    <>
      <PageTitle subtitle={t('today.proposals.pending', { count: pendingCount })}>
        {t('proposals.title')}
      </PageTitle>
      {proposals.data === undefined ? (
        <QueryState isPending={proposals.isPending} onRetry={() => void proposals.refetch()} />
      ) : (
        <div className="flex flex-col gap-4">
          {pending.map((proposal) => {
            const isOpen = isAwaitingDecision(proposal.status);
            return (
              <ProposalCard
                key={proposal.slug}
                title={proposal.title}
                categoryLabel={t(selectCategoryLabelKey(proposal.category))}
                priorityLabel={t(selectPriorityLabelKey(proposal.priority))}
                priorityTone={selectPriorityTone(proposal.priority)}
                dateLabel={
                  proposal.expiresOn === undefined
                    ? t('proposals.created', {
                        date: formatShortDay(proposal.createdOn, DISPLAY_LOCALE),
                      })
                    : t('proposals.expires', {
                        date: formatShortDay(proposal.expiresOn, DISPLAY_LOCALE),
                      })
                }
                whyHtml={renderMarkdownToSafeHtml(proposal.why)}
                draft={proposal.draft}
              >
                {isOpen ? (
                  <ProposalDecisionForm
                    slug={proposal.slug}
                    isPending={decideProposal.isPending}
                    startsCommenting={decidedHereSlugs.has(proposal.slug)}
                    onDecided={(payload) => {
                      keepOnBoard(proposal.slug);
                      decideProposal.mutate({ slug: proposal.slug, ...payload });
                    }}
                  />
                ) : (
                  <ProposalOutcome
                    isAccepted={isAcceptedOutcome(proposal.status)}
                    label={t(selectOutcomeKey(proposal.status))}
                    action={renderRevokeButton(proposal)}
                  />
                )}
              </ProposalCard>
            );
          })}
          {pending.length === 0 ? (
            <Card tone="flat">
              <EmptyState
                icon="proposals"
                title={t('proposals.empty')}
                body={t('proposals.empty-body')}
              />
            </Card>
          ) : null}
          {decided.length === 0 ? null : (
            <details className="group rounded-lg border border-line bg-surface">
              <summary className="flex items-center justify-between gap-2 min-h-13 px-4 cursor-pointer list-none text-body-sm font-semibold text-ink-soft">
                {t('proposals.history', { count: decided.length })}
                <Icon
                  name="chevron"
                  size={16}
                  className="transition-transform group-open:rotate-90"
                />
              </summary>
              <ul className="m-0 px-4 pb-2 list-none">
                {decided.map((proposal) => (
                  <DecidedProposalRow
                    key={proposal.slug}
                    title={proposal.title}
                    statusLabel={t(selectStatusLabelKey(proposal.status))}
                    statusTone={selectStatusTone(proposal.status)}
                    decisions={proposal.decisions}
                    action={renderRevokeButton(proposal)}
                  />
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </>
  );
}
