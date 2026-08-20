import type { JSX, ReactNode } from 'react';
import { composeClassName } from '../atoms/class-name.utils';

export interface BottomActionBarProps {
  readonly children: ReactNode;
  readonly className?: string;
}

// @FollowsBlueprint molecule-presentational
export function BottomActionBar({ children, className }: BottomActionBarProps): JSX.Element {
  return (
    <div
      className={composeClassName(
        'fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30',
        'flex items-center justify-end gap-2 flex-wrap',
        'border-t border-line bg-bg/95 backdrop-blur px-4 py-2',
        'lg:inset-x-auto lg:right-9 lg:bottom-6 lg:rounded-lg lg:border lg:shadow-lg',
        className,
      )}
    >
      {children}
    </div>
  );
}
