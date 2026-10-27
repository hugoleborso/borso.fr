/** @Feature install-offer */

import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';

export interface InstallBannerProps {
  readonly onShowWalkthrough: () => void;
  readonly onDismiss: () => void;
}

// @FollowsBlueprint molecule-presentational
export function InstallBanner({ onShowWalkthrough, onDismiss }: InstallBannerProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <aside
      aria-label={t('install.title')}
      className="flex items-center gap-2 pl-4 pr-1 py-1 bg-accent-soft text-ink-900 border-b border-line text-xs"
    >
      <Icon name="install" size={16} className="text-accent-ink" />
      <span className="flex-1 min-w-0">{t('install.banner')}</span>
      <Button variant="ghost" size="sm" onClick={onShowWalkthrough} className="text-accent-ink">
        {t('install.showMe')}
      </Button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('install.dismiss')}
        className="inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-md text-ink-500 hover:text-ink-900 bg-transparent border-0 cursor-pointer"
      >
        <Icon name="close" size={16} />
      </button>
    </aside>
  );
}
