import type { JSX } from 'react';
import { composeClassName } from './class-name.utils';

export type MeanderLane = 'inner' | 'outer';
export type MeanderTone = 'now' | 'ahead';

export interface MeanderRailProps {
  readonly lane: MeanderLane;
  readonly tone: MeanderTone;
  readonly isFirst: boolean;
}

const LANE_POSITION: Readonly<Record<MeanderLane, string>> = {
  inner: 'left-[19px]',
  outer: 'left-[25px]',
};

const TONE_COLOR: Readonly<Record<MeanderTone, string>> = {
  now: 'bg-meander-now',
  ahead: 'bg-meander',
};

// @FollowsBlueprint atom-plain
export function MeanderRail({ lane, tone, isFirst }: MeanderRailProps): JSX.Element {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-11">
      <span
        className={composeClassName(
          'absolute bottom-0 w-[2px]',
          isFirst ? 'top-5' : 'top-0',
          LANE_POSITION[lane],
          TONE_COLOR[tone],
        )}
      />
      {isFirst ? null : (
        <span
          className={composeClassName('absolute top-0 left-[19px] w-2 h-[2px]', TONE_COLOR[tone])}
        />
      )}
    </span>
  );
}
