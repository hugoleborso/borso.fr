import type { ReactNode } from 'react';

export interface SheetProps {
  readonly label: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

// @FollowsBlueprint atom-plain
export function Sheet({ label, onClose, children }: SheetProps) {
  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end bg-scrim">
      <button
        type="button"
        aria-label={label}
        tabIndex={-1}
        onClick={onClose}
        className="min-h-0 flex-1 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="mx-auto flex max-h-[90dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-sheet px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-outline bg-panel"
      >
        {children}
      </div>
    </div>
  );
}
