import clsx from 'clsx';

export interface ProgressBarProps {
  readonly current: number;
  readonly total: number;
  readonly label: string;
}

// @FollowsBlueprint atom-plain
export function ProgressBar({ current, total, label }: ProgressBarProps) {
  return (
    <div role="img" aria-label={label} className="grid grid-cols-10 gap-1">
      {Array.from({ length: total }, (_, index) => index + 1).map((step) => (
        <span
          key={step}
          className={clsx(
            'h-1.5 rounded-full',
            step < current && 'bg-accent-deep',
            step === current && 'bg-accent',
            step > current && 'bg-surface-2',
          )}
        />
      ))}
    </div>
  );
}
