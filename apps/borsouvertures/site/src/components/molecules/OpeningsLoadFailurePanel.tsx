import { useTranslation } from 'react-i18next';
import { ErrorPanel } from '@/components/atoms/ErrorPanel';

function reloadPage(): void {
  window.location.reload();
}

// @FollowsBlueprint molecule-presentational
export function OpeningsLoadFailurePanel() {
  const { t } = useTranslation();
  return (
    <ErrorPanel
      title={t('load-failure.title')}
      message={t('load-failure.message')}
      reloadLabel={t('common.action.reload')}
      onReload={reloadPage}
    />
  );
}
