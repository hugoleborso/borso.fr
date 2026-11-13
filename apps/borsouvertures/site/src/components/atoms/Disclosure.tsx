import type { ReactNode } from 'react';

interface DisclosureProps {
  summary: string;
  board?: ReactNode;
  children: ReactNode;
}

// @FollowsBlueprint atom-plain
export function Disclosure({ summary, board, children }: DisclosureProps) {
  return (
    <details className="group border-b border-rule">
      <summary className="flex items-center gap-3 min-h-16 py-2 font-bold leading-snug list-none [&::-webkit-details-marker]:hidden hover:bg-surface">
        {board}
        <span className="flex-auto min-w-0 text-balance">{summary}</span>
        <span
          aria-hidden="true"
          className="shrink-0 size-2.5 mr-2 border-r-[2.5px] border-b-[2.5px] border-ink rotate-45 -translate-y-0.5 transition-transform duration-200 ease-out-quick group-open:-rotate-135 group-open:translate-y-0.5"
        />
      </summary>
      <div className="flex flex-col gap-3 pb-4">{children}</div>
    </details>
  );
}
