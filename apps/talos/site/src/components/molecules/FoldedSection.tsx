import type { JSX, ReactNode } from 'react';
import { Icon } from '../atoms/Icon';

export interface FoldedSectionProps {
  readonly label: string;
  readonly children: ReactNode;
}

// @FollowsBlueprint molecule-presentational
export function FoldedSection({ label, children }: FoldedSectionProps): JSX.Element {
  return (
    <details className="group rounded-lg border border-line bg-surface">
      <summary className="flex items-center justify-between gap-2 min-h-13 px-4 cursor-pointer list-none text-body-sm font-semibold text-ink-soft">
        {label}
        <Icon name="chevron" size={16} className="transition-transform group-open:rotate-90" />
      </summary>
      <ul className="m-0 px-4 pb-2 list-none">{children}</ul>
    </details>
  );
}
