import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../atoms/Icon';
import { SectionTitle } from '../atoms/SectionTitle';

export interface PageLink {
  readonly href: string;
  readonly label: string;
}

export interface PageLinkListProps {
  readonly title: string;
  readonly emptyLabel: string;
  readonly links: readonly PageLink[];
}

// @FollowsBlueprint molecule-presentational
export function PageLinkList({ title, emptyLabel, links }: PageLinkListProps): JSX.Element {
  return (
    <section className="mt-6">
      <SectionTitle>{title}</SectionTitle>
      {links.length === 0 ? (
        <p className="m-0 text-caption text-ink-muted">{emptyLabel}</p>
      ) : (
        <ul className="m-0 p-0 list-none flex flex-wrap gap-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                to={link.href}
                className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-md border border-line bg-surface text-body-sm text-patina no-underline active:bg-sunk"
              >
                <Icon name="link" size={14} />
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
