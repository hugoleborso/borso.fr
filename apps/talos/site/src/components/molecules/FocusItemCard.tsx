import type { JSX } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';

export interface FocusItemCardProps {
  readonly rank: number;
  readonly title: string;
  readonly why?: string;
  readonly horizonLabel?: string;
  readonly isHorizonPast: boolean;
}

// @FollowsBlueprint molecule-presentational
export function FocusItemCard({
  rank,
  title,
  why,
  horizonLabel,
  isHorizonPast,
}: FocusItemCardProps): JSX.Element {
  return (
    <li className="flex gap-3 py-3 border-b border-line last:border-b-0 first:pt-0 last:pb-0">
      <span className="w-5 shrink-0 font-display text-(length:--text-focus) leading-(--text-focus--line-height) font-medium text-bronze [font-variant-numeric:oldstyle-nums]">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 font-display text-(length:--text-focus) leading-(--text-focus--line-height) font-medium text-ink">
          {title}
        </p>
        {why === undefined ? null : <p className="m-0 mt-0.5 text-body-sm text-ink-soft">{why}</p>}
        {horizonLabel === undefined ? null : (
          <p
            className={composeClassName(
              'm-0 mt-1 flex items-center gap-1 text-caption',
              isHorizonPast ? 'text-danger' : 'text-ink-muted',
            )}
          >
            <Icon name="calendar" size={14} />
            {horizonLabel}
          </p>
        )}
      </div>
    </li>
  );
}
