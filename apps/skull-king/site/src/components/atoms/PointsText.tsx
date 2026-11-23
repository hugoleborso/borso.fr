import clsx from 'clsx';
import type { PointsTone } from '@site/lib/game-scores.core';

const TONES: Readonly<Record<PointsTone, string>> = {
  pending: 'text-muted-2',
  gain: 'text-made',
  loss: 'text-missed',
};

const SIZES = {
  small: 'text-sm font-bold',
  cell: 'text-base font-bold',
  large: 'text-2xl font-extrabold',
  huge: 'text-3xl font-extrabold',
} as const;

export interface PointsTextProps {
  readonly text: string;
  readonly tone: PointsTone;
  readonly size: keyof typeof SIZES;
  readonly className?: string;
}

// @FollowsBlueprint atom-variant-table
export function PointsText({ text, tone, size, className }: PointsTextProps) {
  return <span className={clsx('tabular-nums', SIZES[size], TONES[tone], className)}>{text}</span>;
}
