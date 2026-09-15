import clsx from 'clsx';
import type { JSX, ReactNode } from 'react';

export interface SegmentButtonProps {
  readonly isSelected: boolean;
  readonly onSelect: () => void;
  readonly children: ReactNode;
}

// @FollowsBlueprint atom-lookup-variants
export function SegmentButton({ isSelected, onSelect, children }: SegmentButtonProps): JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={clsx(
        'min-h-11 px-4 rounded-full text-sm cursor-pointer border-0 transition-colors',
        isSelected ? 'bg-accent text-surface' : 'bg-transparent text-ink-500',
      )}
    >
      {children}
    </button>
  );
}
