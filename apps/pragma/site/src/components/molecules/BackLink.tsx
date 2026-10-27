import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../atoms/Icon';

export interface BackLinkProps {
  readonly to: string;
  readonly label: string;
}

// @FollowsBlueprint molecule-presentational
export function BackLink({ to, label }: BackLinkProps): JSX.Element {
  return (
    <Link
      to={to}
      className="inline-flex self-start items-center gap-1.5 min-h-11 -ml-1 px-1 text-meta text-ink-soft hover:text-ink transition-colors no-underline"
    >
      <Icon name="chevL" size="sm" />
      {label}
    </Link>
  );
}
