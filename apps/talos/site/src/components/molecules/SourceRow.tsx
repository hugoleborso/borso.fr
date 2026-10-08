import type { JSX, ReactNode } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';

export interface SourceRowProps {
  readonly icon: IconName;
  readonly children: ReactNode;
  readonly href?: string;
}

const ROW_CLASS_NAME = 'flex items-center gap-2 min-h-11 px-3 text-body-sm break-all';

// @FollowsBlueprint molecule-presentational
export function SourceRow({ icon, children, href }: SourceRowProps): JSX.Element {
  const glyph = <Icon name={icon} size={18} className="text-ink-muted" />;
  if (href === undefined) {
    return (
      <div className={composeClassName(ROW_CLASS_NAME, 'font-mono text-mono-sm text-ink-soft')}>
        {glyph}
        {children}
      </div>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={composeClassName(ROW_CLASS_NAME, 'text-patina no-underline active:bg-sunk')}
    >
      {glyph}
      {children}
    </a>
  );
}
