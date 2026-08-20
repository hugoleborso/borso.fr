import { useTranslation } from 'react-i18next';
import { LoadingPanel } from '@/components/atoms/LoadingPanel';

// @FollowsBlueprint molecule-presentational
export function LearnPickPrompt() {
  const { t } = useTranslation();
  return <LoadingPanel message={t('learn.pick-prompt')} />;
}
