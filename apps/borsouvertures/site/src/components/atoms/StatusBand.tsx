import { type StatusBandTone, statusBandVariants } from './status-band.variants';

interface StatusBandProps {
  label: string;
  value: string;
  tone: StatusBandTone;
}

// @FollowsBlueprint atom-variant
export function StatusBand({ label, value, tone }: StatusBandProps) {
  return (
    <div className={statusBandVariants({ tone })}>
      <div className="text-sm font-medium opacity-85">{label}</div>
      <div className="text-lg font-bold leading-snug text-balance">{value}</div>
    </div>
  );
}
