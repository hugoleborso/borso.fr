export type StatusBandTone = 'asking' | 'recalled' | 'missed';

const BAND_BASE =
  'flex flex-col gap-0.5 min-h-14 px-4 py-2 -mx-4 roomy:mx-0 roomy:rounded-md ' +
  'transition-[background-color,color] duration-200 ease-out-quick';

// @FollowsBlueprint component-lookup-table
const BAND_CLASS_BY_TONE: Record<StatusBandTone, string> = {
  asking: BAND_BASE + ' bg-surface text-ink',
  recalled: BAND_BASE + ' bg-recalled text-on-recalled',
  missed: BAND_BASE + ' bg-missed text-on-missed',
};

interface StatusBandProps {
  label: string;
  value: string;
  tone: StatusBandTone;
}

// @FollowsBlueprint atom-plain
export function StatusBand({ label, value, tone }: StatusBandProps) {
  return (
    <div className={BAND_CLASS_BY_TONE[tone]}>
      <div className="text-sm font-medium opacity-85">{label}</div>
      <div className="text-lg font-bold leading-snug text-balance">{value}</div>
    </div>
  );
}
