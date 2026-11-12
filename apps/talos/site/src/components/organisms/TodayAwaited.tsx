import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { FoldedSection } from '../molecules/FoldedSection';
import { type OpenCommitment, OpenCommitmentRow } from './OpenCommitmentRow';

export interface TodayAwaitedProps {
  readonly commitments: readonly OpenCommitment[];
  readonly today: string;
}

// @FollowsBlueprint organism-presentational
export function TodayAwaited({ commitments, today }: TodayAwaitedProps): JSX.Element | null {
  const { t } = useTranslation();
  if (commitments.length === 0) return null;
  return (
    <FoldedSection label={t('today.awaited', { count: commitments.length })}>
      {commitments.map((commitment) => (
        <OpenCommitmentRow key={commitment.path} commitment={commitment} today={today} />
      ))}
    </FoldedSection>
  );
}
