import type { JSX, MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { readPreviousEntryUrl } from '../../lib/page-location.adapter';
import { Icon } from '../atoms/Icon';
import { selectBackLinkMove } from './back-link.core';

const ONE_ENTRY_BACK = -1;

export interface BackLinkProps {
  readonly to: string;
  readonly label: string;
}

// @FollowsBlueprint molecule-presentational
export function BackLink({ to, label }: BackLinkProps): JSX.Element {
  const navigate = useNavigate();
  const stepBackToParent = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (selectBackLinkMove(event, readPreviousEntryUrl(), to) === 'follow-link') return;
    event.preventDefault();
    void navigate(ONE_ENTRY_BACK);
  };
  return (
    <Link
      to={to}
      replace
      onClick={stepBackToParent}
      className="inline-flex self-start items-center gap-1.5 min-h-11 -ml-1 px-1 text-meta text-ink-soft hover:text-ink transition-colors no-underline"
    >
      <Icon name="chevL" size="sm" />
      {label}
    </Link>
  );
}
