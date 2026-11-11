import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface LatePageRowProps {
  readonly href: string;
  readonly title: string;
  readonly kind: string;
  readonly levelName: string | null;
  readonly summarized: string;
  readonly onLongPress: () => void;
}

// @FollowsBlueprint molecule-presentational
export function LatePageRow({
  href,
  title,
  kind,
  levelName,
  summarized,
  onLongPress,
}: LatePageRowProps): JSX.Element {
  const press = usePressGesture({ onLongPress });
  return (
    <li className="border-b border-line last:border-b-0">
      <Link
        to={href}
        {...press.handlers}
        className={composeClassName(
          'flex items-center gap-3 min-h-13 py-2 no-underline text-ink',
          PRESSABLE_CLASS_NAME,
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="m-0 text-body-sm font-bold truncate">{title}</p>
          <p className="m-0 mt-0.5 text-caption text-ink-muted truncate">
            {kind}
            {levelName === null ? null : ` · ${levelName}`} · {summarized}
          </p>
        </div>
        <Icon name="chevron" size={16} className="text-ink-faint" />
      </Link>
    </li>
  );
}
