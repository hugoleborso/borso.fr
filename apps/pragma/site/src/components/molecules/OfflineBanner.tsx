import { useTranslation } from 'react-i18next';
import { PulsingDot } from '../atoms/PulsingDot';

export interface OfflineBannerProps {
  readonly isVisible: boolean;
}

// @FollowsBlueprint molecule-presentational
export function OfflineBanner({ isVisible }: OfflineBannerProps): JSX.Element | null {
  const { t } = useTranslation();
  if (!isVisible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2.5 border-b border-rule bg-warn-soft px-4 py-2 text-meta text-ink"
    >
      <PulsingDot tone="warn" />
      <span className="font-medium">{t('common.offlineTitle')}</span>
      <span>— {t('common.offlineHint')}</span>
    </div>
  );
}
