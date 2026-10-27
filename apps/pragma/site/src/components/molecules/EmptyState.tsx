import type { JSX, ReactNode } from 'react';
import { Icon, type IconName } from '../atoms/Icon';

export interface EmptyStateProps {
  readonly icon: IconName;
  readonly children: ReactNode;
  readonly action?: ReactNode;
}

// @FollowsBlueprint molecule-presentational
export function EmptyState({ icon, children, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center text-ink-soft">
      <Icon name={icon} size="lg" className="text-ink-faint" />
      <p className="m-0 text-meta">{children}</p>
      {action}
    </div>
  );
}
