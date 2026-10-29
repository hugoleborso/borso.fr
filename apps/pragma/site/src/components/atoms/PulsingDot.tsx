import { composeClassName } from './class-name.utils';

const PULSE_ANIMATION = 'offline-banner-pulse 2s infinite';

const TONE_CLASS = { warn: 'bg-warn', danger: 'bg-danger' } as const;

interface PulsingDotProps {
  readonly tone: keyof typeof TONE_CLASS;
}

// @FollowsBlueprint atom-plain
export function PulsingDot({ tone }: PulsingDotProps): JSX.Element {
  return (
    <span
      className={composeClassName('size-2 rounded-full', TONE_CLASS[tone])}
      style={{ animation: PULSE_ANIMATION }}
      aria-hidden="true"
    />
  );
}
