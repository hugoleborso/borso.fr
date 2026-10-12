import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface PageLink {
  readonly href: string;
  readonly path: string;
  readonly label: string;
}

export interface PageLinkListProps {
  readonly label: string;
  readonly icon: IconName;
  readonly links: readonly PageLink[];
  readonly onLongPress: (link: PageLink) => void;
}

function PageLinkChip({
  link,
  onLongPress,
}: {
  readonly link: PageLink;
  readonly onLongPress: (link: PageLink) => void;
}): JSX.Element {
  const press = usePressGesture({ onLongPress: () => onLongPress(link) });
  return (
    <Link
      to={link.href}
      {...press.handlers}
      className={composeClassName(
        'inline-flex items-center min-h-11 px-3 rounded-md border border-line bg-surface text-body-sm text-patina no-underline active:bg-sunk',
        PRESSABLE_CLASS_NAME,
      )}
    >
      {link.label}
    </Link>
  );
}

// @FollowsBlueprint molecule-presentational
export function PageLinkList({
  label,
  icon,
  links,
  onLongPress,
}: PageLinkListProps): JSX.Element | null {
  if (links.length === 0) return null;
  return (
    <section aria-label={label} className="mt-5 flex items-start gap-2">
      <span className="flex items-center justify-center w-6 h-11 shrink-0 text-ink-muted">
        <Icon name={icon} size={18} />
      </span>
      <ul className="m-0 p-0 list-none flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <PageLinkChip link={link} onLongPress={onLongPress} />
          </li>
        ))}
      </ul>
    </section>
  );
}
