import type { JSX } from 'react';
import { Button } from '../atoms/Button';

export interface UndoSnackbarProps {
  readonly message: string;
  readonly undoLabel: string;
  readonly onUndo: () => void;
}

const SNACKBAR_CLASS =
  'fixed inset-x-4 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md ' +
  'items-center gap-3 rounded-lg border border-rule-strong bg-raised py-2 pr-2 pl-4 text-meta ' +
  'text-ink shadow-overlay ' +
  'lg:bottom-24';

// @FollowsBlueprint molecule-presentational
export function UndoSnackbar({ message, undoLabel, onUndo }: UndoSnackbarProps): JSX.Element {
  return (
    <div role="status" aria-live="polite" className={SNACKBAR_CLASS}>
      <span className="min-w-0 flex-auto truncate">{message}</span>
      <Button variant="secondary" size="sm" icon="undo" onClick={onUndo}>
        {undoLabel}
      </Button>
    </div>
  );
}
