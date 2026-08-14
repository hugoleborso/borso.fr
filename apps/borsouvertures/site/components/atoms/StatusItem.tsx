interface StatusItemProps {
  label: string;
  value: string;
}

// @FollowsBlueprint atom-plain
export function StatusItem({ label, value }: StatusItemProps) {
  return (
    <div className="px-3 py-[0.6rem] rounded-lg bg-sunken">
      <div className="text-[0.85rem] opacity-70">{label}</div>
      <div>{value}</div>
    </div>
  );
}
