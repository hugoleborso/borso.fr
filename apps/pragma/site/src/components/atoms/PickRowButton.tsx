import type { JSX } from 'react';

const PICK_ROW_CLASS =
  'w-full text-left bg-transparent border-0 text-[13px] text-ink-700 hover:bg-bg-elev px-2 py-1 rounded-md cursor-pointer transition-colors';

interface PickRowButtonProps {
  readonly label: string;
  readonly onPick: () => void;
}

// @FollowsBlueprint atom-plain
export function PickRowButton({ label, onPick }: PickRowButtonProps): JSX.Element {
  return (
    <button type="button" onClick={onPick} className={PICK_ROW_CLASS}>
      {label}
    </button>
  );
}
