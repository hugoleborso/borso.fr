/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { composeClassName } from '../atoms/class-name.utils';

export interface SetlistEntryActionsProps {
  readonly onEditSongDefaults: () => void;
  readonly onRemove: () => void;
}

const ACTION_CLASS = 'flex-1 basis-[9rem]';

// @FollowsBlueprint molecule-presentational
export function SetlistEntryActions({
  onEditSongDefaults,
  onRemove,
}: SetlistEntryActionsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" icon="edit" onClick={onEditSongDefaults} className={ACTION_CLASS}>
        {t('songDefaults.open')}
      </Button>
      <Button
        variant="secondary"
        icon="trash"
        onClick={onRemove}
        className={composeClassName(ACTION_CLASS, 'text-danger [&_svg]:text-danger')}
      >
        {t('setlist.removeEntry')}
      </Button>
    </div>
  );
}
