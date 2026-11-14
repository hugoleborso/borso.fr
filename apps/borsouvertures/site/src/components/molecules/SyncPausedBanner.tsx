import { useTranslation } from 'react-i18next';
import { Notice } from '@/components/atoms/Notice';

// @FollowsBlueprint molecule-presentational
export function SyncPausedBanner() {
  const { t } = useTranslation();
  return <Notice message={t('account.sync-paused')} />;
}
