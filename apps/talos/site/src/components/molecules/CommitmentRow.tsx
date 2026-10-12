import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '../atoms/Chip';
import type { ChipTone } from '../atoms/chip.variants';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface CommitmentRowProps {
  readonly href: string;
  readonly variant: 'task' | 'awaited';
  readonly lead: string | null;
  readonly text: string;
  readonly dueLabel?: string;
  readonly dueTone?: ChipTone;
  readonly onLongPress: () => void;
}

const VARIANT_ICON = { task: 'owed', awaited: 'awaited' } as const;
const VARIANT_ICON_SIZE = { task: 22, awaited: 18 } as const;

// @FollowsBlueprint molecule-presentational
export function CommitmentRow({
  href,
  variant,
  lead,
  text,
  dueLabel,
  dueTone = 'neutral',
  onLongPress,
}: CommitmentRowProps): JSX.Element {
  const press = usePressGesture({ onLongPress });
  const isAwaited = variant === 'awaited';
  return (
    <li className="border-b border-line last:border-b-0">
      <Link
        to={href}
        {...press.handlers}
        className={composeClassName(
          'flex items-start gap-1 min-h-13 no-underline',
          isAwaited ? 'text-ink-muted' : 'text-ink',
          PRESSABLE_CLASS_NAME,
        )}
      >
        <span className="flex items-center justify-center w-11 h-11 shrink-0 text-ink-faint">
          <Icon name={VARIANT_ICON[variant]} size={VARIANT_ICON_SIZE[variant]} />
        </span>
        <span className="min-w-0 flex-1 py-3 pr-2">
          <span className="block text-body-sm break-words">
            {lead === null ? null : (
              <>
                <span className="font-semibold">{lead}</span>
                <span aria-hidden="true"> · </span>
              </>
            )}
            {text}
          </span>
          {dueLabel === undefined ? null : (
            <span className="flex flex-wrap gap-1.5 mt-1.5">
              <Chip tone={dueTone}>
                <Icon name="calendar" size={13} />
                {dueLabel}
              </Chip>
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
