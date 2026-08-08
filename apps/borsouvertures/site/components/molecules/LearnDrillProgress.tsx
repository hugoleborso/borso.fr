import { useTranslation } from 'react-i18next';
import { StatusItem } from '@/components/atoms/StatusItem';

interface LearnDrillProgressProps {
  visitedCount: number;
  totalCount: number;
}

export function LearnDrillProgress({ visitedCount, totalCount }: LearnDrillProgressProps) {
  const { t } = useTranslation();
  return (
    <div className="panel status-grid">
      <StatusItem
        label={t('learn.lines-visited.label')}
        value={t('learn.lines-visited.value', { visited: visitedCount, total: totalCount })}
      />
    </div>
  );
}
