/** @Feature streaks */

import type { JSX } from 'react';
import { BlazeMark } from '../atoms/BlazeMark';
import { BonfireMark } from '../atoms/BonfireMark';
import { Chip } from '../atoms/Chip';
import type { FlameTone } from '../atoms/flame-mark.utils';

export interface FlameChipProps {
  readonly mineDays: number;
  readonly mineTone: FlameTone;
  readonly bandDays: number;
  readonly bandTone: FlameTone;
  readonly label: string;
  readonly onPress: () => void;
}

// @FollowsBlueprint molecule-presentational
export function FlameChip({
  mineDays,
  mineTone,
  bandDays,
  bandTone,
  label,
  onPress,
}: FlameChipProps): JSX.Element {
  return (
    <Chip aria-label={label} title={label} onPress={onPress} className="tabular-nums">
      <BlazeMark tone={mineTone} size="md" />
      {mineDays}
      <span aria-hidden="true" className="mx-1 h-4 w-px bg-rule-strong" />
      <BonfireMark tone={bandTone} size="md" />
      {bandDays}
    </Chip>
  );
}
