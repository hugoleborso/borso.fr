import type { JSX, ReactNode } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';

export interface ProposalOutcomeProps {
  readonly isAccepted: boolean;
  readonly label: string;
  readonly action?: ReactNode;
}

// @FollowsBlueprint molecule-presentational
export function ProposalOutcome({ isAccepted, label, action }: ProposalOutcomeProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
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
      {action}
    </div>
  );
}
