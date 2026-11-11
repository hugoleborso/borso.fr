import { isDecisionRevocable, isProposalPending } from '@domain/proposal.core';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { BackLink } from '../molecules/BackLink';
import { DecidedProposalRow } from '../molecules/DecidedProposalRow';
import { EmptyState } from '../molecules/EmptyState';
import { QueryState } from '../molecules/QueryState';
import { RevokeDecisionButton } from '../molecules/RevokeDecisionButton';
import { toIsoDay } from '../../lib/calendar-day.utils';
import {
  useCancelProposalDecision,
  useDecideProposal,
  useProposals,
} from '../../lib/queries/proposals.queries';
import { PendingProposal } from './PendingProposal';
import {
  findProposal,
  PROPOSALS_PATH,
  selectProposalStatus,
  selectStatusLabelKey,
  selectStatusTone,
} from './proposal-board.core';

export interface ProposalViewProps {
  readonly slug: string;
}

// @FollowsBlueprint organism-mutation-panel
export function ProposalView({ slug }: ProposalViewProps): JSX.Element {
  const { t } = useTranslation();
  const proposals = useProposals();
  const decideProposal = useDecideProposal();
  const cancelDecision = useCancelProposalDecision();
  const [today] = useState(() => toIsoDay(new Date()));
  const [wasTouchedHere, setWasTouchedHere] = useState(false);
  const proposal = findProposal(proposals.data ?? [], slug);
  const isWriting = decideProposal.isPending || cancelDecision.isPending;
  if (proposals.data === undefined) {
    return (
      <>
        <BackLink to={PROPOSALS_PATH} label={t('common.back')} />
        <QueryState isPending={proposals.isPending} onRetry={() => void proposals.refetch()} />
      </>
    );
  }
  if (proposal === null) {
    return (
      <>
        <BackLink to={PROPOSALS_PATH} label={t('common.back')} />
        <EmptyState icon="proposals" label={t('proposals.not-found')} />
      </>
    );
  }
  const status = selectProposalStatus(proposal, today);
  const isPending = isProposalPending(proposal, today);
  const isRevocable = isDecisionRevocable(status);
  return (
    <div className="flex flex-col gap-3 pb-4">
      <BackLink to={PROPOSALS_PATH} label={t('common.back')} />
      {isPending ? (
        <PendingProposal
          proposal={proposal}
          isWriting={isWriting}
          startsCommenting={wasTouchedHere}
          onDecide={(payload) => {
            setWasTouchedHere(true);
            decideProposal.mutate({ slug, ...payload });
          }}
        />
      ) : (
        <Card padding="none" className="px-4">
          <ul className="m-0 p-0 list-none">
            <DecidedProposalRow
              title={proposal.title}
              statusLabel={t(selectStatusLabelKey(status))}
              statusTone={selectStatusTone(status)}
              decisions={proposal.decisions}
              action={
                isRevocable ? (
                  <RevokeDecisionButton
                    label={t('proposals.revoke')}
                    isDisabled={isWriting}
                    onRevoke={() => {
                      setWasTouchedHere(true);
                      cancelDecision.mutate({ slug });
                    }}
                  />
                ) : undefined
              }
            />
          </ul>
        </Card>
      )}
    </div>
  );
}
