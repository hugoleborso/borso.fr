/** @Feature install-offer */

import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';

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
      className="flex items-center gap-2 pl-4 pr-1 py-1 bg-accent-soft text-ink border-b border-rule text-meta"
    >
      <Icon name="install" size="sm" className="text-accent-strong" />
      <span className="flex-1 min-w-0">{t('install.banner')}</span>
      <Button variant="quiet" size="sm" icon="arrowR" onClick={onShowWalkthrough}>
        {t('install.showMe')}
      </Button>
      <IconButton icon="close" label={t('install.dismiss')} onClick={onDismiss} />
    </aside>
  );
}
