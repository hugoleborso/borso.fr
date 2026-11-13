import type { ValueByFlag } from '@/lib/componentTable.types';

interface ShareBarProps {
  label: string;
  percent: number;
  isMeasured: boolean;
}

const FRAME_BASE = 'flex items-end h-12 rounded-sm border';

// @FollowsBlueprint component-lookup-table
const FRAME_CLASS_BY_MEASURED: ValueByFlag<string> = {
  true: FRAME_BASE + ' border-transparent bg-raised',
  false: FRAME_BASE + ' border-dashed border-edge',
};

const FILL_CLASS_BY_MEASURED: ValueByFlag<string> = {
  true: 'w-full min-h-0.5 rounded-sm bg-accent',
  false: 'hidden',
};

// @FollowsBlueprint atom-plain
export function ShareBar({ label, percent, isMeasured }: ShareBarProps) {
  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={FRAME_CLASS_BY_MEASURED[`${isMeasured}`]}
    >
      <div className={FILL_CLASS_BY_MEASURED[`${isMeasured}`]} style={{ height: `${percent}%` }} />
    </div>
  );
}
