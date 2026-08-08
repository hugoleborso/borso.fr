import type { ReactNode } from 'react';
import { selectVisibility, type Visibility } from './visibility.utils';

const CHILDREN_BY_VISIBILITY: Readonly<Record<Visibility, (children: ReactNode) => ReactNode>> = {
  shown: (children) => children,
  hidden: () => null,
};

interface ShowProps {
  readonly when: boolean;
  readonly children: ReactNode;
}

/**
 * Render the children only when the claim holds. The alternative, a ternary
 * or a logical operator inside the parent's markup, puts a branch in a place
 * no test can reach without rendering the whole parent.
 */
export function Show({ when, children }: ShowProps) {
  return <>{CHILDREN_BY_VISIBILITY[selectVisibility(when)](children)}</>;
}
