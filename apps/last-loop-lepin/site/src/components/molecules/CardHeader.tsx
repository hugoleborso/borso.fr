import type { ReactNode } from 'react';

interface CardHeaderProps {
  readonly title: string;
  /** Right hand note, e.g. a count or the edition name. */
  readonly hint?: ReactNode;
}

// @FollowsBlueprint molecule-presentational
export function CardHeader({ title, hint }: CardHeaderProps) {
  return (
    <div className="card-head">
      <h2 className="card-title">{title}</h2>
      {hint}
    </div>
  );
}
