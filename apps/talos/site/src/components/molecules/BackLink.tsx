import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '../atoms/button.variants';
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
      aria-label={label}
      className={buttonVariants({ variant: 'quiet', size: 'icon', className: '-ml-3 mt-2' })}
    >
      <Icon name="back" size={22} />
    </Link>
  );
}
