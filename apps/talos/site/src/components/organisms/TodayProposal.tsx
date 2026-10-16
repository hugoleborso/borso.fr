import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SectionTitle } from '../atoms/SectionTitle';
import { useDecideProposal, useProposals } from '../../lib/queries/proposals.queries';
import { PendingProposal } from './PendingProposal';
import { partitionProposals } from './proposal-board.core';

export interface TodayProposalProps {
  readonly today: string;
}

// @FollowsBlueprint organism-mutation-panel
export function TodayProposal({ today }: TodayProposalProps): JSX.Element | null {
  const { t } = useTranslation();
  const proposals = useProposals();
  const decideProposal = useDecideProposal();
  const { pending } = partitionProposals(proposals.data ?? [], today);
  const [first] = pending;
  if (first === undefined) return null;
  return (
    <section aria-label={t('today.proposals.title')}>
      <SectionTitle
        trailing={
          <Link
            to="/proposals"
            className="inline-flex items-center min-h-11 px-1 text-caption text-ink-muted no-underline"
          >
            {t('today.proposals.all', { count: pending.length })}
          </Link>
        }
      >
        {t('today.proposals.title')}
      </SectionTitle>
      <PendingProposal
        key={first.slug}
        proposal={first}
        isWriting={decideProposal.isPending}
        startsCommenting={false}
        showsDraft={false}
        onDecide={(payload) => {
          decideProposal.mutate({ slug: first.slug, ...payload });
        }}
      />
    </section>
  );
}
