/**
 * A page's primary actions, anchored to the bottom of the screen just
 * above the tab bar rather than to the header strip.
 *
 * The header strip is the one band of a phone a thumb cannot reach while
 * the other hand holds it, and on the session page the setlist actions
 * happened to be painted flush under the fixed tab bar at rest, so every
 * tap aimed at them switched tab instead. The bar clears the tab bar by
 * the tab bar's own height plus the home indicator, because the bar pads
 * itself by `env(safe-area-inset-bottom)` and a fixed offset left this
 * row half under it on any handset reporting a non-zero inset.
 *
 * From `lg` up there is no tab bar and no reach problem, so the row
 * floats in the bottom-right corner of the content area instead of
 * spanning a viewport that is mostly sidebar.
 */

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
