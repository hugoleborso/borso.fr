import { useTranslation } from 'react-i18next';
import { StatusItem } from '@/components/atoms/StatusItem';

interface DailyCountsProps {
  dueCount: number;
  newCount: number;
}

// @FollowsBlueprint molecule-presentational
export function DailyCounts({ dueCount, newCount }: DailyCountsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatusItem label={t('today.due')} value={String(dueCount)} />
      <StatusItem label={t('today.new')} value={String(newCount)} />
    </div>
  );
}
