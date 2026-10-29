/** @Feature streaks */

import type { JSX } from 'react';
import { BlazeMark } from '../atoms/BlazeMark';
import { BonfireMark } from '../atoms/BonfireMark';
import { Chip } from '../atoms/Chip';
import type { FlameTone } from '../atoms/flame-mark.utils';

export type FlameScope = 'personal' | 'band';

const FLAME_MARK = {
  personal: BlazeMark,
  band: BonfireMark,
} as const satisfies Readonly<Record<FlameScope, typeof BlazeMark>>;

export interface FlameChipProps {
  readonly scope: FlameScope;
  readonly days: number;
  readonly tone: FlameTone;
  readonly label: string;
  readonly onPress: () => void;
}

// @FollowsBlueprint molecule-presentational
export function FlameChip({ scope, days, tone, label, onPress }: FlameChipProps): JSX.Element {
  const Mark = FLAME_MARK[scope];
  return (
    <Chip aria-label={label} title={label} onPress={onPress} className="tabular-nums">
      <Mark tone={tone} size="md" />
      {days}
    </Chip>
  );
}
