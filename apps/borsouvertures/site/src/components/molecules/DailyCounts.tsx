import { useTranslation } from 'react-i18next';
import { CountFigure } from '@/components/atoms/CountFigure';

interface DailyCountsProps {
  dueCount: number;
  newCount: number;
}

// @FollowsBlueprint molecule-presentational
export function DailyCounts({ dueCount, newCount }: DailyCountsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-4">
      <CountFigure label={t('today.due')} value={String(dueCount)} />
      <CountFigure label={t('today.new')} value={String(newCount)} />
    </div>
  );
}
