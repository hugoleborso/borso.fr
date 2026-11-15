import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ProposalCard } from '../molecules/ProposalCard';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { DISPLAY_LOCALE, formatShortDay } from '../../lib/calendar-day.utils';
import { renderMarkdownToSafeHtml } from '../../lib/markdown.utils';
import { ProposalDecisionForm } from './ProposalDecisionForm';
import {
  type DecisionPayload,
  PROPOSAL_SHEET_ACTION,
  selectCategoryLabelKey,
  selectPriorityLabelKey,
  selectPriorityTone,
  selectSheetDecisions,
} from './proposal-board.core';

export interface PendingProposalShape {
  readonly slug: string;
  readonly title: string;
  readonly category: string;
  readonly priority: string;
  readonly createdOn: string;
  readonly expiresOn?: string;
  readonly why: string;
  readonly draft: string;
  readonly options: readonly string[];
}

export interface PendingProposalProps {
  readonly proposal: PendingProposalShape;
  readonly isWriting: boolean;
  readonly startsCommenting: boolean;
  readonly onDecide: (payload: DecisionPayload) => void;
}

// @FollowsBlueprint organism-presentational
export function PendingProposal({
  proposal,
  isWriting,
  startsCommenting,
  onDecide,
}: PendingProposalProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <ProposalCard
      title={proposal.title}
      categoryLabel={t(selectCategoryLabelKey(proposal.category))}
      priorityLabel={t(selectPriorityLabelKey(proposal.priority))}
      priorityTone={selectPriorityTone(proposal.priority)}
      dateLabel={
        proposal.expiresOn === undefined
          ? t('proposals.created', { date: formatShortDay(proposal.createdOn, DISPLAY_LOCALE) })
          : t('proposals.expires', { date: formatShortDay(proposal.expiresOn, DISPLAY_LOCALE) })
      }
      whyHtml={renderMarkdownToSafeHtml(proposal.why)}
      draft={proposal.draft}
      onLongPress={() => {
        openActionSheet({
          title: proposal.title,
          subject: { kind: 'proposal', slug: proposal.slug },
          actions: selectSheetDecisions(proposal.options).map((decision) => ({
            ...PROPOSAL_SHEET_ACTION[decision],
            onSelect: () => {
              onDecide({ decision });
            },
          })),
        });
      }}
    >
      <ProposalDecisionForm
        slug={proposal.slug}
        options={proposal.options}
        isPending={isWriting}
        startsCommenting={startsCommenting}
        onDecided={onDecide}
      />
    </ProposalCard>
  );
}
