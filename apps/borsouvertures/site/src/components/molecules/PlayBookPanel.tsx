import { useTranslation } from 'react-i18next';
import { Panel } from '@/components/atoms/Panel';

// @FollowsBlueprint molecule-presentational
export function PlayBookPanel() {
  const { t } = useTranslation();
  return (
    <Panel title={t('play.title')}>
      <p>{t('play.description')}</p>
    </Panel>
  );
}
