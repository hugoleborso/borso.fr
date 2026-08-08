import { useTranslation } from 'react-i18next';
import { useSyncExternalStore } from 'react';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock-store';
import { formatHourMinute } from '../../lib/formatters.utils';
import { Show } from '../atoms/Show';
import { isCorrectionBannerVisible } from './correction-banner.utils';

interface CorrectionBannerProps {
  readonly correctedAt: Date | null;
}

/**
 * Public notice shown for one minute after a punch correction lands. It reads
 * the shared wall clock, so it dismisses itself as the predicate turns false
 * on a later tick.
 */
export function CorrectionBanner({ correctedAt }: CorrectionBannerProps) {
  const { t } = useTranslation();
  const nowMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  const correctionTime = correctedAt ?? new Date(nowMs);
  return (
    <Show when={isCorrectionBannerVisible(correctedAt, nowMs)}>
      <div className="banner" role="status">
        {t('correction-banner.message', { time: formatHourMinute(correctionTime) })}
      </div>
    </Show>
  );
}
