import { useTranslation } from 'react-i18next';
import { useSyncExternalStore } from 'react';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock-store';
import { formatHourMinute } from '../../lib/formatters.utils';
import { listPresent } from '../../lib/optional.utils';
import { Show } from '../atoms/Show';
import { isCorrectionBannerVisible } from './correction-banner.utils';

interface CorrectionBannerProps {
  readonly correctedAt: Date | null;
}

// @FollowsBlueprint molecule-clock-subscriber
export function CorrectionBanner({ correctedAt }: CorrectionBannerProps) {
  const { t } = useTranslation();
  const nowMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  return (
    <>
      {listPresent(correctedAt).map((correctionTime) => (
        <Show
          key={correctionTime.getTime()}
          when={isCorrectionBannerVisible(correctionTime, nowMs)}
        >
          <div
            className="px-5 py-3 text-center font-mono text-[12px] bg-warn/20 text-warn border-b border-warn/40"
            role="status"
          >
            {t('correction-banner.message', { time: formatHourMinute(correctionTime) })}
          </div>
        </Show>
      ))}
    </>
  );
}
