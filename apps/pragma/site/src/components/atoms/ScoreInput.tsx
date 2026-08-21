import type { JSX, MouseEvent, WheelEvent } from 'react';

const SCORE_INPUT_CLASS =
  'w-12 min-h-11 text-center bg-bg-elev border border-line rounded-sm text-base py-1 outline-none focus:border-ink-700 font-mono';

// @FollowsBlueprint component-lookup-table
const STEP_BY_SCROLLED_UP: Readonly<Record<`${boolean}`, number>> = { true: 1, false: -1 };

interface ScoreInputProps {
  readonly value: number | null;
  readonly minimum: number;
  readonly maximum: number;
  readonly label: string;
  readonly onStep: (step: number) => void;
  readonly onEdit: (rawValue: string) => void;
  readonly onClear: () => void;
}

// @FollowsBlueprint atom-plain
export function ScoreInput({
  value,
  minimum,
  maximum,
  label,
  onStep,
  onEdit,
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
      value={value ?? ''}
      aria-label={label}
      className={SCORE_INPUT_CLASS}
      onWheel={stepOnWheel}
      onContextMenu={clearOnContextMenu}
      onChange={(event) => {
        onEdit(event.target.value);
      }}
    />
  );
}
