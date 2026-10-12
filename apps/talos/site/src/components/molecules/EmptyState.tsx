import type { JSX } from 'react';
import { Icon, type IconName } from '../atoms/Icon';

export interface EmptyStateProps {
  readonly icon: IconName;
  readonly label: string;
}

// @FollowsBlueprint molecule-presentational
export function EmptyState({ icon, label }: EmptyStateProps): JSX.Element {
  return (
    <div role="status" className="flex justify-center py-6 text-ink-faint">
      <Icon name={icon} size={28} />
      <span className="sr-only">{label}</span>
    </div>
  );
}
