import type { JSX } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';

export interface ProposalOutcomeProps {
  readonly isAccepted: boolean;
  readonly label: string;
}

// @FollowsBlueprint molecule-presentational
export function ProposalOutcome({ isAccepted, label }: ProposalOutcomeProps): JSX.Element {
  return (
    <p
      role="status"
      className={composeClassName(
        'm-0 flex items-center gap-2 min-h-11 text-body-sm font-semibold',
        isAccepted ? 'text-success' : 'text-ink-muted',
      )}
    >
      <Icon name={isAccepted ? 'check' : 'close'} size={18} />
      {label}
    </p>
  );
}
