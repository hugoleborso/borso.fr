import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { Panel } from '@/components/atoms/Panel';

interface ReviewSummaryProps {
  recalledCount: number;
  answeredCount: number;
  recalledPercent: number;
  dueTomorrowCount: number;
  onLeave: () => void;
}

// @FollowsBlueprint molecule-presentational
export function ReviewSummary({
  recalledCount,
  answeredCount,
  recalledPercent,
  dueTomorrowCount,
  onLeave,
}: ReviewSummaryProps) {
  const { t } = useTranslation();
  return (
    <Panel title={t('review.completed.title')}>
      <p>
        {t('review.completed.recalled-share', {
          recalled: recalledCount,
          total: answeredCount,
          percent: recalledPercent,
        })}
      </p>
      <p>{t('review.completed.due-tomorrow', { count: dueTomorrowCount })}</p>
      <Button label={t('review.completed.back')} variant="primary" onActivate={onLeave} />
    </Panel>
  );
}
