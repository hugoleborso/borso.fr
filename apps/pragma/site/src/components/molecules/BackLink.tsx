/**
 * The "up one level" link at the top of a detail page.
 *
 * It is a molecule because the same three lines had been pasted onto every
 * detail route, and every copy was a 16px-tall strip — a quarter of what a
 * thumb needs. Fixing the height in one place is the point of the file.
 */

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
      className="inline-flex self-start items-center gap-1.5 min-h-11 -ml-1 px-1 text-xs text-ink-500 hover:text-ink-900 transition-colors no-underline"
    >
      <Icon name="chevL" size={14} />
      {label}
    </Link>
  );
}
