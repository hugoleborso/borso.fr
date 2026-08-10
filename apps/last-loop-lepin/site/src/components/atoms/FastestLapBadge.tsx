const CHRONOMETER_PATH =
  'M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z';

interface FastestLapBadgeProps {
  /** Accessible name, supplied by the caller through the translation layer. */
  readonly title: string;
}

/**
 * Inline chronometer mark. Inline rather than an asset so the SVG can carry
 * its own `<title>`, which is what screen readers announce.
 */
// @FollowsBlueprint atom-plain
export function FastestLapBadge({ title }: FastestLapBadgeProps) {
  return (
    <span className="leaderboard-chip__fastest-lap-badge">
      <svg viewBox="0 0 24 24" role="img">
        <title>{title}</title>
        <path d={CHRONOMETER_PATH} />
      </svg>
    </span>
  );
}
