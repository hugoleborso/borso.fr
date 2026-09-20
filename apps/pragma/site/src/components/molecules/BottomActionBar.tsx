import type { JSX, ReactNode } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { useIsBottomActionBarShowing } from './bottom-action-bar.hook';

const TUCKED_AWAY_BELOW_THE_TAB_BAR = 'translate-y-[calc(100%+3.5rem+env(safe-area-inset-bottom))]';

export interface BottomActionBarProps {
  readonly children: ReactNode;
  readonly className?: string;
}

// @FollowsBlueprint molecule-presentational
export function BottomActionBar({ children, className }: BottomActionBarProps): JSX.Element {
  const isShowing = useIsBottomActionBarShowing();
  return (
    <div
      data-showing={isShowing}
      className={composeClassName(
        'fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30',
        'flex items-center justify-end gap-2 flex-wrap',
        'border-t border-line bg-bg/95 backdrop-blur px-4 py-2',
        'lg:inset-x-auto lg:right-9 lg:bottom-6 lg:rounded-lg lg:border lg:shadow-lg',
        'transition-transform duration-200 ease-out motion-reduce:transition-none',
        isShowing ? 'translate-y-0' : `${TUCKED_AWAY_BELOW_THE_TAB_BAR} lg:translate-y-0`,
        className,
      )}
    >
      {children}
    </div>
  );
}
