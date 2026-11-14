import { useTranslation } from 'react-i18next';
import { ErrorPanel } from '@/components/atoms/ErrorPanel';

function reloadPage(): void {
  window.location.reload();
}

// @FollowsBlueprint molecule-presentational
export function DecksLoadFailurePanel() {
  const { t } = useTranslation();
  return (
    <ErrorPanel
      title={t('decks.load-failure.title')}
      message={t('decks.load-failure.message')}
      reloadLabel={t('common.action.reload')}
      onReload={reloadPage}
    />
  );
}
