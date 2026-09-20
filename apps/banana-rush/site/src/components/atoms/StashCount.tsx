import clsx from 'clsx';
import { BananaIcon } from './BananaIcon';

export interface StashCountProps {
  readonly count: number;
  readonly className?: string;
  readonly iconClassName?: string;
}

// @FollowsBlueprint atom-plain
export function StashCount({ count, className, iconClassName }: StashCountProps) {
  return (
    <span className={clsx('inline-flex items-center gap-1 font-extrabold tabular-nums', className)}>
      <BananaIcon className={clsx('h-4 w-4', iconClassName)} />
      {count}
    </span>
  );
}
