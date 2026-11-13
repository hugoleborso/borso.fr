import { useTranslation } from 'react-i18next';
import { Notice } from '@/components/atoms/Notice';

// @FollowsBlueprint molecule-presentational
export function ProgressNotKeptBanner() {
  const { t } = useTranslation();
  return <Notice message={t('review.progress-not-kept')} />;
}
