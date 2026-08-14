/**
 * ScoreInput atom — one mastery cell. Three affordances share one value:
 * typing it, wheeling it by a step, and clearing it from the context menu. The
 * atom owns the affordances and reports the intent; clamping and persistence
 * belong to the caller, which already has the pure helper for both.
 */

import type { JSX, MouseEvent, WheelEvent } from 'react';

const SCORE_INPUT_CLASS =
  'w-12 min-h-11 text-center bg-bg-elev border border-line rounded-sm text-base py-1 outline-none focus:border-ink-700 font-mono';

// @FollowsBlueprint component-lookup-table
const STEP_BY_SCROLLED_UP: Readonly<Record<`${boolean}`, number>> = { true: 1, false: -1 };

interface ScoreInputProps {
  readonly value: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly label: string;
  readonly onStep: (step: number) => void;
  readonly onType: (typedValue: number) => void;
  readonly onClear: () => void;
}

// @FollowsBlueprint atom-plain
export function ScoreInput({
  value,
  minimum,
  maximum,
  label,
  onStep,
  onType,
  onClear,
}: ScoreInputProps): JSX.Element {
  function stepOnWheel(event: WheelEvent<HTMLInputElement>): void {
    event.preventDefault();
    onStep(STEP_BY_SCROLLED_UP[`${event.deltaY < 0}`]);
  }

  function clearOnContextMenu(event: MouseEvent<HTMLInputElement>): void {
    event.preventDefault();
    onClear();
  }

  return (
    <input
      type="number"
      min={minimum}
      max={maximum}
      value={value}
      aria-label={label}
      className={SCORE_INPUT_CLASS}
      onWheel={stepOnWheel}
      onContextMenu={clearOnContextMenu}
      onChange={(event) => {
        onType(Number(event.target.value));
      }}
    />
  );
}
