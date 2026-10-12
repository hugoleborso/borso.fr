import type { JSX, ReactNode } from 'react';

export interface StickyFormActionsProps {
  readonly children: ReactNode;
}

// @FollowsBlueprint atom-plain
export function StickyFormActions({ children }: StickyFormActionsProps): JSX.Element {
  return (
    <div className="sticky z-20 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:static flex items-center gap-2 mt-2 py-2 bg-bg-elev/95 backdrop-blur border-t border-line lg:border-0 lg:bg-transparent lg:backdrop-blur-none lg:py-0">
      {children}
    </div>
  );
}
