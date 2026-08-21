/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';

export interface SetlistEntryActionsProps {
  readonly onEditLineupOverride: () => void;
  readonly onEditDefaultLineup: () => void;
  readonly onEditSongDefaults: () => void;
  readonly onRemove: () => void;
}

const ACTION_CLASS =
  'min-h-11 flex-1 basis-[9rem] inline-flex items-center justify-center gap-2 rounded-md border ' +
  'border-line bg-bg-elev px-3 text-sm text-ink-700 cursor-pointer hover:border-line-strong';

// @FollowsBlueprint molecule-presentational
export function SetlistEntryActions({
  onEditLineupOverride,
  onEditDefaultLineup,
  onEditSongDefaults,
  onRemove,
}: SetlistEntryActionsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onEditLineupOverride} className={ACTION_CLASS}>
        <Icon name="members" size={15} />
        {t('lineup.editOverride')}
      </button>
      <button type="button" onClick={onEditDefaultLineup} className={ACTION_CLASS}>
        <Icon name="members" size={15} />
        {t('lineup.editDefault')}
      </button>
      <button type="button" onClick={onEditSongDefaults} className={ACTION_CLASS}>
        <Icon name="edit" size={14} />
        {t('songDefaults.open')}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className={composeClassName(ACTION_CLASS, 'text-danger hover:border-danger')}
      >
        <Icon name="trash" size={14} />
        {t('setlist.removeEntry')}
      </button>
    </div>
  );
}
