import { useTranslation } from 'react-i18next';
import { Panel } from '@/components/atoms/Panel';

interface LearnDrillPanelProps {
  variationName: string;
}

// @FollowsBlueprint molecule-presentational
export function LearnDrillPanel({ variationName }: LearnDrillPanelProps) {
  const { t } = useTranslation();
  return (
    <Panel title={t('learn.title', { variation: variationName })}>
      <p>{t('learn.description')}</p>
    </Panel>
  );
}
