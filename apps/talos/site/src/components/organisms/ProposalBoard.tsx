import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isDecisionRevocable } from '@domain/proposal.core';
import { PageTitle } from '../atoms/PageTitle';
import { DecidedProposalRow } from '../molecules/DecidedProposalRow';
import { EmptyState } from '../molecules/EmptyState';
import { FoldedSection } from '../molecules/FoldedSection';
import { QueryState } from '../molecules/QueryState';
import { RevokeDecisionButton } from '../molecules/RevokeDecisionButton';
import { toIsoDay } from '../../lib/calendar-day.utils';
import {
  useCancelProposalDecision,
  useDecideProposal,
  useProposals,
} from '../../lib/queries/proposals.queries';
import { PendingProposal } from './PendingProposal';
import { partitionProposals, selectStatusLabelKey, selectStatusTone } from './proposal-board.core';

// @FollowsBlueprint organism-mutation-panel
export function ProposalBoard(): JSX.Element {
  const { t } = useTranslation();
  const proposals = useProposals();
  const decideProposal = useDecideProposal();
  const cancelDecision = useCancelProposalDecision();
  const [today] = useState(() => toIsoDay(new Date()));
  const [touchedHereSlugs, setTouchedHereSlugs] = useState<ReadonlySet<string>>(new Set());
  const { pending, expired, decided } = partitionProposals(proposals.data ?? [], today);
  const rememberTouched = (slug: string): void => {
    setTouchedHereSlugs((slugs) => new Set([...slugs, slug]));
  };
  const isWriting = decideProposal.isPending || cancelDecision.isPending;

  return (
    <>
      <PageTitle subtitle={t('today.proposals.pending', { count: pending.length })}>
        {t('proposals.title')}
      </PageTitle>
      {proposals.data === undefined ? (
        <QueryState isPending={proposals.isPending} onRetry={() => void proposals.refetch()} />
      ) : (
        <div className="flex flex-col gap-4">
          {pending.map((proposal) => (
            <PendingProposal
              key={proposal.slug}
              proposal={proposal}
              isWriting={isWriting}
              startsCommenting={touchedHereSlugs.has(proposal.slug)}
              showsDraft
              onDecide={(payload) => {
                rememberTouched(proposal.slug);
                decideProposal.mutate({ slug: proposal.slug, ...payload });
              }}
            />
          ))}
          {pending.length === 0 ? (
            <EmptyState icon="proposals" label={t('proposals.empty')} />
          ) : null}
          {expired.length === 0 ? null : (
            <FoldedSection label={t('proposals.expired', { count: expired.length })}>
              {expired.map((proposal) => (
                <DecidedProposalRow
                  key={proposal.slug}
                  title={proposal.title}
                  statusLabel={t('proposals.status.expired')}
                  statusTone="outline"
                  decisions={proposal.decisions}
                />
              ))}
            </FoldedSection>
          )}
          {decided.length === 0 ? null : (
            <FoldedSection label={t('proposals.history', { count: decided.length })}>
              {decided.map((proposal) => {
                const isRevocable = isDecisionRevocable(proposal.status);
                return (
                  <DecidedProposalRow
                    key={proposal.slug}
                    title={proposal.title}
                    statusLabel={t(selectStatusLabelKey(proposal.status))}
                    statusTone={selectStatusTone(proposal.status)}
                    decisions={proposal.decisions}
                    action={
                      isRevocable ? (
                        <RevokeDecisionButton
                          label={t('proposals.revoke')}
                          isDisabled={isWriting}
                          onRevoke={() => {
                            rememberTouched(proposal.slug);
                            cancelDecision.mutate({ slug: proposal.slug });
                          }}
                        />
                      ) : undefined
                    }
                  />
                );
              })}
            </FoldedSection>
          )}
        </div>
      )}
    </>
  );
}
