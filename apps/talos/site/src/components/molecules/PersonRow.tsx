import type { JSX, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface PersonRowProps {
  readonly href: string;
  readonly title: string;
  readonly icon: IconName;
  readonly leading?: ReactNode;
  readonly trailing: ReactNode;
  readonly onLongPress: () => void;
}

// @FollowsBlueprint molecule-presentational
export function PersonRow({
  href,
  title,
  icon,
  leading,
  trailing,
  onLongPress,
}: PersonRowProps): JSX.Element {
  const press = usePressGesture({ onLongPress });
  return (
    <li className="border-b border-line last:border-b-0">
      <Link
        to={href}
        {...press.handlers}
        className={composeClassName(
          'flex items-center gap-1 min-h-13 pr-3 no-underline text-ink',
          PRESSABLE_CLASS_NAME,
        )}
      >
        <span className="flex items-center justify-center w-11 h-11 shrink-0 text-node-person">
          {leading ?? <Icon name={icon} size={20} />}
        </span>
        <span className="min-w-0 flex-1 py-3 text-body-sm truncate">{title}</span>
        <span className="flex items-center gap-1.5 shrink-0">{trailing}</span>
      </Link>
    </li>
  );
}
