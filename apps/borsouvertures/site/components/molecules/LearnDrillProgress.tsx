import { useTranslation } from 'react-i18next';
import { StatusItem } from '@/components/atoms/StatusItem';

interface LearnDrillProgressProps {
  visitedCount: number;
  totalCount: number;
}

// @FollowsBlueprint molecule-presentational
export function LearnDrillProgress({ visitedCount, totalCount }: LearnDrillProgressProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-2 p-4 rounded-xl border border-panel-line bg-panel backdrop-blur-[6px]">
      <StatusItem
        label={t('learn.lines-visited.label')}
        value={t('learn.lines-visited.value', { visited: visitedCount, total: totalCount })}
      />
    </div>
  );
}
