import clsx from 'clsx';

const PERCENTAGE_SCALE = 100;

const FILL_CLASS_NAME =
  'absolute top-0 bottom-0 left-0 transition-[width] duration-1000 ease-[cubic-bezier(.2,.7,.3,1)]';
const MARKER_CLASS_NAME = 'absolute -top-[3px] -bottom-[3px] w-0.5';

export type ProgressBarTone = 'edition' | 'month';

interface ProgressBarAppearance {
  track: string;
  fill: string;
  marker: string;
}

/** The edition bar carries a marker at the fill's edge; the month bar does not. */
const APPEARANCE_BY_TONE: Readonly<Record<ProgressBarTone, ProgressBarAppearance>> = {
  edition: {
    track: 'relative h-2.5 overflow-hidden bg-labours-stripe',
    fill: 'bg-labours-ink',
    marker: 'bg-labours-accent',
  },
  month: {
    track: 'relative h-2 overflow-hidden bg-labours-stripe',
    fill: 'bg-labours-accent',
    marker: 'bg-transparent',
  },
};

interface ProgressBarProps {
  ratio: number;
  tone: ProgressBarTone;
}

// @FollowsBlueprint atom-plain
export function ProgressBar({ ratio, tone }: ProgressBarProps) {
  const appearance = APPEARANCE_BY_TONE[tone];
  const filledPercentage = `${ratio * PERCENTAGE_SCALE}%`;
  return (
    <div className={appearance.track}>
      <div className={clsx(FILL_CLASS_NAME, appearance.fill)} style={{ width: filledPercentage }} />
      <div
        className={clsx(MARKER_CLASS_NAME, appearance.marker)}
        style={{ left: filledPercentage }}
      />
    </div>
  );
}
