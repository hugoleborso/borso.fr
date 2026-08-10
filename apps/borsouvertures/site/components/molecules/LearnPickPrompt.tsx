import { useTranslation } from 'react-i18next';
import { LoadingPanel } from '@/components/atoms/LoadingPanel';

/** Shown when a drill is started without a variation to drill. */
export function LearnPickPrompt() {
  const { t } = useTranslation();
  return <LoadingPanel message={t('learn.pick-prompt')} />;
}
