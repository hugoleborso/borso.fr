import clsx from 'clsx';

export interface TrickTallyProps {
  readonly counted: string;
  readonly expected: number;
  readonly isBalanced: boolean;
  readonly label: string;
  readonly size: 'large' | 'medium';
}

// @FollowsBlueprint atom-plain
export function TrickTally({ counted, expected, isBalanced, label, size }: TrickTallyProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={clsx(
        'font-extrabold tabular-nums',
        size === 'large' ? 'min-w-16 text-3xl' : 'text-2xl',
        isBalanced ? 'text-made' : 'text-accent',
      )}
    >
      {counted}
      <span className="text-base text-muted-2"> / {expected}</span>
    </span>
  );
}
