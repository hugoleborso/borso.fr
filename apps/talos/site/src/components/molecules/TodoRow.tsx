import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Checkbox } from '../atoms/Checkbox';
import { Chip } from '../atoms/Chip';
import type { ChipTone } from '../atoms/chip.variants';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';

export interface TodoRowProps {
  readonly text: string;
  readonly isDone: boolean;
  readonly dueLabel: string | null;
  readonly dueTone: ChipTone;
  readonly dueIcon?: IconName;
  readonly hasCommitment: boolean;
  readonly onToggle: () => void;
  readonly onEdit?: () => void;
}

// @FollowsBlueprint molecule-presentational
export function TodoRow({
  text,
  isDone,
  dueLabel,
  dueTone,
  dueIcon = 'calendar',
  hasCommitment,
  onToggle,
  onEdit,
}: TodoRowProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <li className="flex items-start gap-1 min-h-13 border-b border-line last:border-b-0">
      <Checkbox isChecked={isDone} label={t('todo.row.toggle', { text })} onToggle={onToggle} />
      <div className="min-w-0 flex-1 py-3">
        <p
          className={composeClassName(
            'm-0 text-body-sm break-words',
            isDone ? 'text-ink-muted line-through' : 'text-ink',
          )}
        >
          {text}
        </p>
        <div className="flex flex-wrap gap-1.5 empty:hidden mt-1.5">
          {dueLabel === null ? null : (
            <Chip tone={isDone ? 'neutral' : dueTone}>
              <Icon name={dueIcon} size={13} />
              {dueLabel}
            </Chip>
          )}
          {hasCommitment ? (
            <Chip tone="neutral">
              <span className="w-2 h-2 rounded-full bg-node-commitment" />
              {t('todo.row.commitment')}
            </Chip>
          ) : null}
        </div>
      </div>
      {onEdit === undefined ? null : (
        <Button
          variant="quiet"
          size="icon"
          aria-label={t('todo.row.edit', { text })}
          onClick={onEdit}
        >
          <Icon name="edit" size={18} />
        </Button>
      )}
    </li>
  );
}
