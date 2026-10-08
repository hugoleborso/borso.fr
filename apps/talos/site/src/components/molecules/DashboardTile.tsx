import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface DashboardTileProps {
  readonly to: string;
  readonly icon: IconName;
  readonly count: number;
  readonly label: string;
  readonly isAlert: boolean;
  readonly onLongPress: () => void;
}

// @FollowsBlueprint molecule-presentational
export function DashboardTile({
  to,
  icon,
  count,
  label,
  isAlert,
  onLongPress,
}: DashboardTileProps): JSX.Element {
  const press = usePressGesture({ onLongPress });
  return (
    <Link
      to={to}
      {...press.handlers}
      className={composeClassName(
        'flex flex-col justify-between gap-1 min-h-[76px] p-2.5 rounded-lg border no-underline',
        isAlert ? 'border-danger/30 bg-danger-soft text-danger' : 'border-line bg-surface text-ink',
        PRESSABLE_CLASS_NAME,
      )}
    >
      <span className="flex items-center justify-between gap-1">
        <span className="font-display text-display tabular-nums">{count}</span>
        <Icon name={icon} size={18} className={isAlert ? 'text-danger' : 'text-ink-muted'} />
      </span>
      <span className="text-[12px] leading-[15px] font-semibold">{label}</span>
    </Link>
  );
}
