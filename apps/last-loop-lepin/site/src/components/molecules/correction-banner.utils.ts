const CORRECTION_BANNER_LIFETIME_MS = 60_000;

// @FollowsBlueprint utils-pure-module
export function isCorrectionBannerVisible(correctedAt: Date | null, nowMs: number): boolean {
  if (correctedAt === null) return false;
  const elapsedMs = nowMs - correctedAt.getTime();
  return elapsedMs >= 0 && elapsedMs <= CORRECTION_BANNER_LIFETIME_MS;
}
