import type { ReactNode } from 'react';

interface DisclosureProps {
  summary: string;
  children: ReactNode;
}

// @FollowsBlueprint atom-plain
export function Disclosure({ summary, children }: DisclosureProps) {
  return (
    <details className="rounded-lg border border-card-line bg-sunken">
      <summary className="flex items-center min-h-11 px-3 py-2 font-semibold cursor-pointer">
        {summary}
      </summary>
      <div className="flex flex-col gap-3 px-3 pb-3">{children}</div>
    </details>
  );
}
