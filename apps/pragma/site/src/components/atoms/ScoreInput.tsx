import type { JSX, MouseEvent } from 'react';
import { Input, NumberField } from 'react-aria-components';
import { toScoreEditText } from './score-input.utils';

const SCORE_INPUT_CLASS =
  'w-11 min-h-11 appearance-none text-center bg-raised border border-rule-strong rounded-sm text-body py-1 ' +
  'outline-none focus:border-accent font-mono';

interface ScoreInputProps {
  readonly value: number | null;
  readonly minimum: number;
  readonly maximum: number;
  readonly label: string;
  readonly onEdit: (rawValue: string) => void;
  readonly onClear: () => void;
}

// @FollowsBlueprint atom-plain
export function ScoreInput({
  value,
  minimum,
  maximum,
  label,
  onEdit,
  onClear,
}: ScoreInputProps): JSX.Element {
  function clearOnContextMenu(event: MouseEvent<HTMLInputElement>): void {
    event.preventDefault();
    onClear();
  }

  function commit(committedScore: number): void {
    onEdit(toScoreEditText(committedScore));
  }

  return (
    <NumberField
      aria-label={label}
      value={value ?? Number.NaN}
      minValue={minimum}
      maxValue={maximum}
      onChange={commit}
    >
      <Input className={SCORE_INPUT_CLASS} onContextMenu={clearOnContextMenu} />
    </NumberField>
  );
}
