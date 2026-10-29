import type { JSX } from 'react';
import { composeClassName } from './class-name.utils';
import {
  BLAZE_SPARKS,
  FLAME_GLOW_CLASS,
  FLAME_LAYER_PATHS,
  FLAME_LAYERS,
  FLAME_MARK_PIXELS,
  type FlameMarkSize,
  type FlameTone,
} from './flame-mark.utils';

export interface BlazeMarkProps {
  readonly tone: FlameTone;
  readonly size?: FlameMarkSize;
  readonly className?: string;
}

// @FollowsBlueprint atom-plain
export function BlazeMark({ tone, size = 'md', className }: BlazeMarkProps): JSX.Element {
  return (
    <svg
      width={FLAME_MARK_PIXELS[size]}
      height={FLAME_MARK_PIXELS[size]}
      viewBox="0 0 24 24"
      overflow="visible"
      data-flame-mark="blaze"
      data-tone={tone}
      className={composeClassName('inline-block shrink-0', FLAME_GLOW_CLASS[tone], className)}
      aria-hidden="true"
    >
      {FLAME_LAYERS[tone].map(({ layer, className: paint }) => (
        <path
          key={layer}
          d={FLAME_LAYER_PATHS[layer]}
          className={paint}
          strokeWidth="1.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {BLAZE_SPARKS[tone].map(({ cx, cy, r, className: paint }) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} className={paint} />
      ))}
    </svg>
  );
}
