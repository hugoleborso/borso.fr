import type { ReactNode } from 'react';

interface StatusItemProps {
  label: string;
  value: string;
  board?: ReactNode;
}

// @FollowsBlueprint atom-plain
export function StatusItem({ label, value, board }: StatusItemProps) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-rule last:border-b-0">
      {board}
      <div className="flex flex-col min-w-0">
        <div className="text-sm text-ink-muted">{label}</div>
        <div className="text-base font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
