/**
 * The banner shown publicly after a punch correction lands stays up for one
 * minute. The rule is a function of the correction instant and the current
 * time, so the component can re-render on every clock tick and let the
 * predicate flip on its own.
 */

const CORRECTION_BANNER_LIFETIME_MS = 60_000;

export function isCorrectionBannerVisible(correctedAt: Date | null, nowMs: number): boolean {
  if (correctedAt === null) return false;
  const elapsedMs = nowMs - correctedAt.getTime();
  return elapsedMs >= 0 && elapsedMs <= CORRECTION_BANNER_LIFETIME_MS;
}
