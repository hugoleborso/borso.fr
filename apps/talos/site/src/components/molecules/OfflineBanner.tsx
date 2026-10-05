import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../atoms/Icon';

// @FollowsBlueprint molecule-presentational
export function OfflineBanner(): JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className="flex items-center gap-2 mx-4 mt-3 px-3 py-2 rounded-md text-body-sm bg-warning-soft text-warning"
    >
      <Icon name="offline" size={16} />
      <span>{t('common.offline')}</span>
    </div>
  );
}
