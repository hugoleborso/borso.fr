import type { JSX } from 'react';
import { Icon, type IconName } from '../atoms/Icon';

export interface EmptyStateProps {
  readonly icon: IconName;
  readonly title: string;
  readonly body?: string;
}

// @FollowsBlueprint molecule-presentational
export function EmptyState({ icon, title, body }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-6 px-4">
      <span className="flex items-center justify-center w-12 h-12 rounded-full bg-sunk text-ink-muted">
        <Icon name={icon} size={22} />
      </span>
      <p className="m-0 font-display text-prose-heading text-ink">{title}</p>
      {body === undefined ? null : <p className="m-0 text-body-sm text-ink-muted">{body}</p>}
    </div>
  );
}
