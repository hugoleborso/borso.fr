import { useTranslation } from 'react-i18next';
import { LoadingPanel } from '@/components/atoms/LoadingPanel';

// @FollowsBlueprint molecule-presentational
export function OpeningsLoadingPanel() {
  const { t } = useTranslation();
  return <LoadingPanel message={t('loading.openings')} />;
}
