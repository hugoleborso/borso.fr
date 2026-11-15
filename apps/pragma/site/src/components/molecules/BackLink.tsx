import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../atoms/Icon';
import { useStepBackTo } from './step-back.hook';

export interface BackLinkProps {
  readonly to: string;
  readonly label: string;
}

// @FollowsBlueprint molecule-presentational
export function BackLink({ to, label }: BackLinkProps): JSX.Element {
  const stepBackToParent = useStepBackTo(to);
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
