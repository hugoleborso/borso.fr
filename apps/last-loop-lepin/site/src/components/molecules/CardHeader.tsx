import type { ReactNode } from 'react';

interface CardHeaderProps {
  readonly title: string;
  /** Right hand note, e.g. a count or the edition name. */
  readonly hint?: ReactNode;
}

// @FollowsBlueprint molecule-presentational
export function CardHeader({ title, hint }: CardHeaderProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 py-4 border-b border-line-soft">
      <h2 className="font-display text-[13px] font-semibold uppercase tracking-[0.06em]">
        {title}
      </h2>
      {hint}
    </div>
  );
}
