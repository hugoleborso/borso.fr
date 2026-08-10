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
/**
 * @Blueprint branchless-render
 * @BlueprintName Branchless Conditional Render
 * @BlueprintUsage Use for showing or hiding a subtree without writing a ternary or a logical operator in the parent's markup.
 * @BlueprintDescription Sends the boolean through `selectVisibility`, a pure covered selector that returns the union `'shown' | 'hidden'`, and uses the result as the key into `CHILDREN_BY_VISIBILITY`, a frozen record of renderers. The branch therefore lives in a tested function rather than inside JSX, and the record's key type derives from the union so a new visibility is a type error.
 */
export function Show({ when, children }: ShowProps) {
  return <>{CHILDREN_BY_VISIBILITY[selectVisibility(when)](children)}</>;
}
