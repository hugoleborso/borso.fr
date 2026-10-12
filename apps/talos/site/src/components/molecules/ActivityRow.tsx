import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { composeClassName } from '../atoms/class-name.utils';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface ActivityRowProps {
  readonly href: string;
  readonly heading: string;
  readonly dayLabel: string | null;
  readonly onLongPress: () => void;
}

// @FollowsBlueprint molecule-presentational
export function ActivityRow({
  href,
  heading,
  dayLabel,
  onLongPress,
}: ActivityRowProps): JSX.Element {
  const press = usePressGesture({ onLongPress });
  return (
    <li>
      <Link
        to={href}
        {...press.handlers}
        className={composeClassName(
          'flex items-center gap-3 min-h-11 py-2 no-underline text-ink-soft',
          PRESSABLE_CLASS_NAME,
        )}
      >
        <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-patina" />
        <span className="min-w-0 flex-1 text-body-sm truncate">{heading}</span>
        {dayLabel === null ? null : <span className="text-caption text-ink-muted">{dayLabel}</span>}
      </Link>
    </li>
  );
}
