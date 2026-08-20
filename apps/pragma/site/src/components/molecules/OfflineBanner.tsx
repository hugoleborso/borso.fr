import { useTranslation } from 'react-i18next';
import { PulsingDot } from '../atoms/PulsingDot';

export interface OfflineBannerProps {
  readonly isVisible: boolean;
}

const DOT_COLOR = '#e0a445';

// @FollowsBlueprint molecule-presentational
export function OfflineBanner({ isVisible }: OfflineBannerProps): JSX.Element | null {
  const { t } = useTranslation();
  if (!isVisible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-[#2d251c] text-[#f4e2c8] px-4 py-2 text-xs flex items-center gap-2.5 border-b border-[rgba(255,255,255,0.06)]"
    >
      <PulsingDot color={DOT_COLOR} />
      <span className="font-medium">{t('common.offlineTitle')}</span>
      <span className="opacity-70">— {t('common.offlineHint')}</span>
    </div>
  );
}
