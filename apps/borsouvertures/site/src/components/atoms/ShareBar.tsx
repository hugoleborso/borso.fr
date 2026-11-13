import type { ValueByFlag } from '@/lib/componentTable.types';

interface ShareBarProps {
  label: string;
  percent: number;
  isMeasured: boolean;
}

const FRAME_BASE = 'flex items-end h-10';

// @FollowsBlueprint component-lookup-table
const FRAME_CLASS_BY_MEASURED: ValueByFlag<string> = {
  true: FRAME_BASE + ' bg-surface',
  false: FRAME_BASE + ' border-b-2 border-rule',
};

const FILL_CLASS_BY_MEASURED: ValueByFlag<string> = {
  true: 'w-full min-h-0.5 bg-ink',
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
