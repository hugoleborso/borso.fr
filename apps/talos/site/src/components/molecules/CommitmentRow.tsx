import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '../atoms/Chip';
import type { ChipTone } from '../atoms/chip.variants';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface CommitmentRowProps {
  readonly href: string;
  readonly title: string;
  readonly icon: IconName;
  readonly directionLabel: string;
  readonly counterpartLabel?: string;
  readonly dueLabel?: string;
  readonly dueTone?: ChipTone;
  readonly onLongPress: () => void;
}

// @FollowsBlueprint molecule-presentational
export function CommitmentRow({
  href,
  title,
  icon,
  directionLabel,
  counterpartLabel,
  dueLabel,
  dueTone = 'neutral',
  onLongPress,
}: CommitmentRowProps): JSX.Element {
  const press = usePressGesture({ onLongPress });
  return (
    <li className="border-b border-line last:border-b-0">
      <Link
        to={href}
        {...press.handlers}
        className={composeClassName(
          'flex items-start gap-1 min-h-13 no-underline text-ink',
          PRESSABLE_CLASS_NAME,
        )}
      >
        <span className="flex items-center justify-center w-11 h-11 shrink-0 text-node-commitment">
          <Icon name={icon} size={20} />
          <span className="sr-only">{directionLabel}</span>
        </span>
        <span className="min-w-0 flex-1 py-3 pr-2">
          <span className="block text-body-sm break-words">{title}</span>
          {counterpartLabel === undefined && dueLabel === undefined ? null : (
            <span className="flex flex-wrap gap-1.5 mt-1.5">
              {dueLabel === undefined ? null : (
                <Chip tone={dueTone}>
                  <Icon name="calendar" size={13} />
                  {dueLabel}
                </Chip>
              )}
              {counterpartLabel === undefined ? null : (
                <Chip tone="neutral">{counterpartLabel}</Chip>
              )}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
