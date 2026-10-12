import type { JSX } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface FocusItemCardProps {
  readonly rank: number;
  readonly title: string;
  readonly why?: string;
  readonly horizonLabel?: string;
  readonly isHorizonPast: boolean;
  readonly onLongPress: () => void;
}

// @FollowsBlueprint molecule-presentational
export function FocusItemCard({
  rank,
  title,
  why,
  horizonLabel,
  isHorizonPast,
  onLongPress,
}: FocusItemCardProps): JSX.Element {
  const press = usePressGesture({ onLongPress });
  return (
    <li
      {...press.handlers}
      className={composeClassName(
        'flex gap-3 py-2.5 border-b border-line last:border-b-0 first:pt-0 last:pb-0',
        PRESSABLE_CLASS_NAME,
      )}
    >
      <span className="w-4 shrink-0 font-display text-prose-heading font-medium text-bronze [font-variant-numeric:oldstyle-nums]">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 font-display text-prose-heading font-medium text-ink">{title}</p>
        <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-ink-soft empty:hidden">
          {why === undefined ? null : <span>{why}</span>}
          {horizonLabel === undefined ? null : (
            <span
              className={composeClassName(
                'inline-flex items-center gap-1',
                isHorizonPast ? 'text-danger' : 'text-ink-muted',
              )}
            >
              <Icon name="calendar" size={13} />
              {horizonLabel}
            </span>
          )}
        </p>
      </div>
    </li>
  );
}
