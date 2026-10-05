import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../atoms/Icon';

export interface SearchResultRowProps {
  readonly href: string;
  readonly title: string;
  readonly path: string;
  readonly excerpt: string;
}

// @FollowsBlueprint molecule-presentational
export function SearchResultRow({ href, title, path, excerpt }: SearchResultRowProps): JSX.Element {
  return (
    <li className="border-b border-line last:border-b-0">
      <Link to={href} className="flex items-center gap-3 min-h-13 py-3 no-underline text-ink">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-body-sm font-bold">{title}</p>
          <p className="m-0 mt-0.5 font-mono text-mono-sm text-ink-muted truncate">{path}</p>
          <p className="m-0 mt-1 text-caption text-ink-soft line-clamp-2">{excerpt}</p>
        </div>
        <Icon name="chevron" size={16} className="text-ink-faint" />
      </Link>
    </li>
  );
}
