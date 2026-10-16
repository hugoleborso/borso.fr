import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface CounterPillProps {
  readonly to: string;
  readonly icon: IconName;
  readonly count?: number;
  readonly label: string;
  readonly isAlert: boolean;
  readonly onLongPress: () => void;
}

// @FollowsBlueprint molecule-presentational
export function CounterPill({
  to,
  icon,
  count,
  label,
  isAlert,
  onLongPress,
}: CounterPillProps): JSX.Element {
  const press = usePressGesture({ onLongPress });
  return (
    <Link
      to={to}
      {...press.handlers}
      className={composeClassName(
        'inline-flex items-center gap-1.5 min-h-11 px-3 rounded-full border text-caption font-semibold no-underline whitespace-nowrap',
        isAlert
          ? 'border-danger/30 bg-danger-soft text-danger'
          : 'border-line bg-surface text-ink-soft',
        PRESSABLE_CLASS_NAME,
      )}
    >
      <Icon name={icon} size={15} />
      {count === undefined ? null : <span className="tabular-nums text-ink">{count}</span>}
      {label}
    </Link>
  );
}
