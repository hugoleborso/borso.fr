import { useSyncExternalStore } from 'react';
import { getCurrentTime, subscribeClock } from '../clock-store';

const CORRECTION_BANNER_TTL_MS = 60_000;

interface CorrectionBannerProps {
  readonly correctedAt: Date | null;
}

function formatHourMinute(date: Date): string {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Public-facing banner shown for 60 s after a correction lands on a
 * punch (per spec — "correction journalisée publiquement"). Hidden
 * before any correction and after the TTL elapses.
 *
 * Uses the shared wall-clock store so the banner self-dismisses without
 * a useEffect: the clock ticks every second, the component re-renders,
 * and the `now - correctedAt < TTL` predicate flips to false on its own.
 */
export function CorrectionBanner({ correctedAt }: CorrectionBannerProps) {
  const now = useSyncExternalStore(subscribeClock, getCurrentTime, () => Date.now());
  if (correctedAt === null) return null;
  const elapsedMs = now - correctedAt.getTime();
  if (elapsedMs < 0 || elapsedMs > CORRECTION_BANNER_TTL_MS) return null;
  return (
    <div className="banner" role="status">
      Pointage corrigé à {formatHourMinute(correctedAt)}
    </div>
  );
}
