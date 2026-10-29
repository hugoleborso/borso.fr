/** @Feature streaks */

import type { JSX } from 'react';
import { Chip } from '../atoms/Chip';
import { Icon } from '../atoms/Icon';
import { FLAME_TONE_CLASS, type FlameGlyph, type FlameTone } from './flame-tone.core';

export interface FlameChipProps {
  readonly glyph: FlameGlyph;
  readonly days: number;
  readonly tone: FlameTone;
  readonly label: string;
  readonly onPress: () => void;
}

// @FollowsBlueprint molecule-presentational
export function FlameChip({ glyph, days, tone, label, onPress }: FlameChipProps): JSX.Element {
  return (
    <Chip aria-label={label} title={label} onPress={onPress} className="tabular-nums">
      <Icon name={glyph} size="md" className={FLAME_TONE_CLASS[glyph][tone]} />
      {days}
    </Chip>
  );
}
