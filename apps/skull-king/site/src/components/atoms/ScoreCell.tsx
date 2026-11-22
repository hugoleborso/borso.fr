import type { PointsTone } from '@site/lib/game-scores.core';
import { PointsText } from './PointsText';

export interface ScoreCellProps {
  readonly points: string;
  readonly tone: PointsTone;
  readonly detail: string;
  readonly label: string;
  readonly onPress: () => void;
}

// @FollowsBlueprint atom-plain
export function ScoreCell({ points, tone, detail, label, onPress }: ScoreCellProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className="flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5"
    >
      <PointsText text={points} tone={tone} size="cell" />
      <span className="text-xs tabular-nums text-muted-2">{detail}</span>
    </button>
  );
}
