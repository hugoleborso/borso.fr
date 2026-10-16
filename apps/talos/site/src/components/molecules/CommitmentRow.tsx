import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '../atoms/Chip';
import type { ChipTone } from '../atoms/chip.variants';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { MeanderRail, type MeanderRailProps } from '../atoms/MeanderRail';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface CommitmentRowProps {
  readonly href: string;
  readonly variant: 'task' | 'awaited';
  readonly lead: string | null;
  readonly text: string;
  readonly dueLabel?: string;
  readonly dueTone?: ChipTone;
  readonly kindLabel?: string;
  readonly onLongPress: () => void;
  readonly rail?: MeanderRailProps;
}

const VARIANT_ICON = { task: 'commitment', awaited: 'awaited' } as const;

// @FollowsBlueprint molecule-presentational
export function CommitmentRow({
  href,
  variant,
  lead,
  text,
  dueLabel,
  dueTone = 'neutral',
  kindLabel,
  onLongPress,
  rail,
}: CommitmentRowProps): JSX.Element {
  const press = usePressGesture({ onLongPress });
  const isAwaited = variant === 'awaited';
  return (
    <li className="border-b border-line last:border-b-0">
      <Link
        to={href}
        {...press.handlers}
        className={composeClassName(
          'relative flex items-start gap-1 min-h-13 no-underline',
          isAwaited ? 'text-ink-muted' : 'text-ink',
          PRESSABLE_CLASS_NAME,
        )}
      >
        {rail === undefined ? null : <MeanderRail {...rail} />}
        <span className="relative flex items-center justify-center w-11 h-11 shrink-0">
          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-patina-soft text-patina">
            <Icon name={VARIANT_ICON[variant]} size={16} />
          </span>
        </span>
        <span className="min-w-0 flex-1 py-3 pr-2">
          {kindLabel === undefined ? null : (
            <span className="block text-caption text-patina">{kindLabel}</span>
          )}
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
