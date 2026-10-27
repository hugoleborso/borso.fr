import type { JSX, ReactNode } from 'react';

export interface BottomActionsProps {
  readonly children: ReactNode;
}

const STRIP_CLASS =
  'pointer-events-none fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 ' +
  'flex items-center justify-end gap-2 bg-linear-to-t from-paper from-60% to-transparent px-4 pt-5 pb-2 ' +
  '*:pointer-events-auto lg:right-9 lg:bottom-6 lg:left-auto lg:bg-none lg:px-0 lg:pt-0';

// @FollowsBlueprint atom-plain
export function BottomActions({ children }: BottomActionsProps): JSX.Element {
  return (
    <>
      <div aria-hidden="true" className="h-20 lg:h-16" />
      <div className={STRIP_CLASS}>{children}</div>
    </>
  );
}
