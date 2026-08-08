/**
 * OfflineBanner — top-of-shell read-only notice with a pulsing dot.
 * The molecule is purely presentational; the AppShell organism reads
 * the browser's online status and decides when to show it.
 */

import { useTranslation } from 'react-i18next';

export interface OfflineBannerProps {
  readonly isVisible: boolean;
}

export function OfflineBanner({ isVisible }: OfflineBannerProps): JSX.Element | null {
  const { t } = useTranslation();
  if (!isVisible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-[#2d251c] text-[#f4e2c8] px-4 py-2 text-xs flex items-center gap-2.5 border-b border-[rgba(255,255,255,0.06)]"
    >
      <span
        className="w-2 h-2 rounded-full bg-[#e0a445]"
        style={{ animation: 'pragma-pulse 2s infinite' }}
        aria-hidden="true"
      />
      <span className="font-medium">{t('common.offlineTitle')}</span>
      <span className="opacity-70">— {t('common.offlineHint')}</span>
    </div>
  );
}
