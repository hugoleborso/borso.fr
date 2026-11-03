/** @Feature setlists */

import { SETLIST_BREAK_LABEL_MAX_LENGTH } from '@domain/input-limits.core';
import type { JSX, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../atoms/Icon';
import { Menu } from '../molecules/Menu';
import { isSubmitKey, selectChangedLabel } from './setlist-breaks.utils';

export interface SetlistBreakRowProps {
  readonly label: string;
  readonly onRename: (label: string) => void;
  readonly onRemove: () => void;
}

function blurOnEnter(event: KeyboardEvent<HTMLInputElement>): void {
  const isSubmit = isSubmitKey(event.key);
  if (isSubmit) event.currentTarget.blur();
}

// @FollowsBlueprint organism-presentational
export function SetlistBreakRow({ label, onRename, onRemove }: SetlistBreakRowProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <li
      data-setlist-break
      className="flex min-h-11 items-center gap-2 border-b border-dashed border-rule-strong bg-sunk py-1"
    >
      <span className="flex w-5 shrink-0 justify-end text-ink-soft">
        <Icon name="pause" />
      </span>
      <input
        key={label}
        defaultValue={label}
        aria-label={t('setlist.break.label')}
        placeholder={t('setlist.break.placeholder')}
        maxLength={SETLIST_BREAK_LABEL_MAX_LENGTH}
        enterKeyHint="done"
        onKeyDown={blurOnEnter}
        onBlur={(event) => {
          const changedLabel = selectChangedLabel(event.currentTarget.value, label);
          if (changedLabel !== null) onRename(changedLabel);
        }}
        className="min-h-11 min-w-0 flex-1 rounded-md bg-transparent px-1 font-display text-body text-ink uppercase tracking-wide outline-none placeholder:text-ink-soft focus:bg-raised"
      />
      <Menu
        label={t('setlist.break.actions')}
        items={[
          {
            label: t('setlist.break.remove'),
            icon: 'trash',
            tone: 'danger',
            onSelect: onRemove,
          },
        ]}
      />
    </li>
  );
}
