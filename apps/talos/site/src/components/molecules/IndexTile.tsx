import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface IndexTileProps {
  readonly to: string;
  readonly icon: IconName;
  readonly count?: number;
  readonly label: string;
  readonly isAlert: boolean;
  readonly onLongPress?: () => void;
}

// @FollowsBlueprint molecule-presentational
export function IndexTile({
  to,
  icon,
  count,
  label,
  isAlert,
  onLongPress,
}: IndexTileProps): JSX.Element {
  const press = usePressGesture(onLongPress === undefined ? {} : { onLongPress });
  const isRaised = isAlert && count !== undefined && count > 0;
  return (
    <Link
      to={to}
      {...press.handlers}
      className={composeClassName(
        'flex flex-col justify-between min-h-16 px-3 py-2 rounded-lg border no-underline',
        isRaised
          ? 'border-danger/30 bg-danger-soft text-danger'
          : 'border-line bg-surface text-ink-soft',
        PRESSABLE_CLASS_NAME,
      )}
    >
      <span className="flex items-center justify-between gap-2 min-h-7">
        {count === undefined ? null : (
          <span
            className={composeClassName(
              'text-(length:--text-focus) leading-(--text-focus--line-height) font-bold tabular-nums',
              count === 0 ? 'text-ink-faint' : undefined,
            )}
          >
            {count}
          </span>
        )}
        <Icon name={icon} size={16} className={isRaised ? undefined : 'text-ink-muted'} />
      </span>
      <span className="text-caption font-semibold truncate">{label}</span>
    </Link>
  );
}
