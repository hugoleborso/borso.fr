const PULSE_ANIMATION = 'pragma-pulse 2s infinite';

interface PulsingDotProps {
  readonly color: string;
}

// @FollowsBlueprint atom-plain
export function PulsingDot({ color }: PulsingDotProps): JSX.Element {
  return (
    <span
      className="w-2 h-2 rounded-full"
      style={{ background: color, animation: PULSE_ANIMATION }}
      aria-hidden="true"
    />
  );
}
