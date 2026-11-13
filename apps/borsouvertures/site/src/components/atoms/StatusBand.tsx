interface StatusBandProps {
  label: string;
  value: string;
}

// @FollowsBlueprint atom-plain
export function StatusBand({ label, value }: StatusBandProps) {
  return (
    <div className="flex flex-col gap-0.5 min-h-14 px-4 py-2 -mx-4 roomy:mx-0 roomy:rounded-md bg-surface text-ink">
      <div className="text-sm font-medium opacity-85">{label}</div>
      <div className="text-lg font-bold leading-snug text-balance">{value}</div>
    </div>
  );
}
