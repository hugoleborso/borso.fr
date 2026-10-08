import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '../atoms/Chip';
import type { ChipTone } from '../atoms/chip.variants';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface DraftRowProps {
  readonly href: string;
  readonly channelIcon: IconName;
  readonly channelLabel: string;
  readonly recipients: string;
  readonly subject?: string;
  readonly preview: string;
  readonly status?: { readonly label: string; readonly tone: ChipTone };
  readonly onLongPress: () => void;
}

// @FollowsBlueprint molecule-presentational
export function DraftRow({
  href,
  channelIcon,
  channelLabel,
  recipients,
  subject,
  preview,
  status,
  onLongPress,
}: DraftRowProps): JSX.Element {
  const press = usePressGesture({ onLongPress });
  return (
    <li className="border-b border-line last:border-b-0">
      <Link
        to={href}
        {...press.handlers}
        className={composeClassName(
          'flex items-start gap-1 min-h-13 pr-3 no-underline text-ink',
          PRESSABLE_CLASS_NAME,
        )}
      >
        <span className="flex items-center justify-center w-11 h-11 shrink-0 text-patina">
          <Icon name={channelIcon} size={20} />
          <span className="sr-only">{channelLabel}</span>
        </span>
        <span className="min-w-0 flex-1 py-3">
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1 text-body-sm font-semibold truncate">{recipients}</span>
            {status === undefined ? null : <Chip tone={status.tone}>{status.label}</Chip>}
          </span>
          {subject === undefined ? null : (
            <span className="block text-body-sm text-ink truncate">{subject}</span>
          )}
          <span className="block mt-0.5 text-caption text-ink-muted line-clamp-2">{preview}</span>
        </span>
      </Link>
    </li>
  );
}
