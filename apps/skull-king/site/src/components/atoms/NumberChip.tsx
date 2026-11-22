import clsx from 'clsx';
import { type ChipState, isChipChosen } from '@site/lib/chip-layout.core';

const STATES: Readonly<Record<ChipState, string>> = {
  idle: 'bg-surface text-muted',
  raised: 'bg-surface-2 text-text',
  chosen: 'bg-accent text-accent-ink',
  missed: 'bg-missed text-ground',
  blocked: 'bg-transparent text-faint',
};

export interface NumberChipProps {
  readonly value: number;
  readonly state: ChipState;
  readonly onPick: (value: number) => void;
}

// @FollowsBlueprint atom-variant-table
export function NumberChip({ value, state, onPick }: NumberChipProps) {
  const isChosen = isChipChosen(state);
  return (
    <button
      type="button"
      disabled={state === 'blocked'}
      aria-pressed={isChosen}
      onClick={() => {
        onPick(value);
      }}
      className={clsx(
        'h-12 w-full min-w-0 max-w-12 cursor-pointer rounded-chip text-xl font-bold tabular-nums disabled:cursor-default',
        STATES[state],
      )}
    >
      {value}
    </button>
  );
}
