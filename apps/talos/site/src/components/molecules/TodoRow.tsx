import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '../atoms/Checkbox';
import { Chip } from '../atoms/Chip';
import type { ChipTone } from '../atoms/chip.variants';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface TodoRowProps {
  readonly text: string;
  readonly isDone: boolean;
  readonly dueLabel: string | null;
  readonly dueTone: ChipTone;
  readonly dueIcon?: IconName;
  readonly onToggle: () => void;
  readonly onOpen?: () => void;
  readonly onDelete?: () => void;
  readonly onLongPress?: () => void;
}

// @FollowsBlueprint molecule-presentational
export function TodoRow({
  text,
  isDone,
  dueLabel,
  dueTone,
  dueIcon = 'calendar',
  onToggle,
  onOpen,
  onDelete,
  onLongPress,
}: TodoRowProps): JSX.Element {
  const { t } = useTranslation();
  const press = usePressGesture({
    onSwipeRight: onToggle,
    ...(onDelete === undefined ? {} : { onSwipeLeft: onDelete }),
    ...(onLongPress === undefined ? {} : { onLongPress }),
  });
  const isSwipingRight = press.swipeOffset > 0;
  const isSwipingLeft = press.swipeOffset < 0;
  return (
    <li className="relative overflow-hidden border-b border-line last:border-b-0">
      <span
        aria-hidden="true"
        className={composeClassName(
          'absolute inset-0 flex items-center pl-4 bg-success-soft text-success',
          isSwipingRight ? 'opacity-100' : 'opacity-0',
        )}
      >
        <Icon name={isDone ? 'undo' : 'check'} size={22} />
      </span>
      <span
        aria-hidden="true"
        className={composeClassName(
          'absolute inset-0 flex items-center justify-end pr-4 bg-danger-soft text-danger',
          isSwipingLeft ? 'opacity-100' : 'opacity-0',
        )}
      >
        <Icon name="remove" size={22} />
      </span>
      <div
        {...press.handlers}
        style={{ transform: `translateX(${String(press.swipeOffset)}px)` }}
        className={composeClassName(
          'relative flex items-start gap-1 min-h-13 bg-surface touch-pan-y',
          isSwipingRight || isSwipingLeft ? '' : 'transition-transform duration-150',
          PRESSABLE_CLASS_NAME,
        )}
      >
        <Checkbox isChecked={isDone} label={t('todo.row.toggle', { text })} onToggle={onToggle} />
        <button
          type="button"
          tabIndex={onOpen === undefined ? -1 : 0}
          onClick={onOpen}
          className="min-w-0 flex-1 py-3 pr-2 text-left bg-transparent border-0 font-[inherit] text-[inherit] cursor-pointer"
        >
          <p
            className={composeClassName(
              'm-0 text-body-sm break-words',
              isDone ? 'text-ink-muted line-through' : 'text-ink',
            )}
          >
            {text}
          </p>
          {dueLabel === null ? null : (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <Chip tone={isDone ? 'neutral' : dueTone}>
                <Icon name={dueIcon} size={13} />
                {dueLabel}
              </Chip>
            </div>
          )}
        </button>
      </div>
    </li>
  );
}
