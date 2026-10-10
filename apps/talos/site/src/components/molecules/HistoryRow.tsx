import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface HistoryRowProps {
  readonly href: string;
  readonly icon: IconName;
  readonly title: string;
  readonly caption?: string;
  readonly onLongPress: () => void;
}

// @FollowsBlueprint molecule-presentational
export function HistoryRow({
  href,
  icon,
  title,
  caption,
  onLongPress,
}: HistoryRowProps): JSX.Element {
  const press = usePressGesture({ onLongPress });
  return (
    <li className="border-b border-line last:border-b-0">
      <Link
        to={href}
        {...press.handlers}
        className={composeClassName(
          'flex items-center gap-1 min-h-13 pr-2 no-underline text-ink',
          PRESSABLE_CLASS_NAME,
        )}
      >
        <span className="flex items-center justify-center w-11 h-11 shrink-0 text-patina">
          <Icon name={icon} size={20} />
        </span>
        <span className="min-w-0 flex-1 py-3">
          <span className="block text-body-sm first-letter:uppercase line-clamp-2 break-words">
            {title}
          </span>
          {caption === undefined ? null : (
            <span className="block text-caption text-ink-muted">{caption}</span>
          )}
        </span>
        <Icon name="chevron" size={16} className="text-ink-faint" />
      </Link>
    </li>
  );
}
