/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../atoms/Icon';

const NOTICE_CLASS =
  'inline-flex h-6 shrink-0 items-center gap-1 text-label whitespace-nowrap text-warn';

// @FollowsBlueprint molecule-presentational
export function NoLineupNotice(): JSX.Element {
  const { t } = useTranslation();
  return (
    <span className={NOTICE_CLASS}>
      <Icon name="warn" />
      {t('lineup.noLineup')}
    </span>
  );
}
