import { useTranslation } from 'react-i18next';
import { StatusItem } from '@/components/atoms/StatusItem';

interface StreakBadgeProps {
  streakDays: number;
}

// @FollowsBlueprint molecule-presentational
export function StreakBadge({ streakDays }: StreakBadgeProps) {
  const { t } = useTranslation();
  return (
    <StatusItem
      label={t('stats.streak.label')}
      value={t('stats.streak.days', { count: streakDays })}
    />
  );
}
