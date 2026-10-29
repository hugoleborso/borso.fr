import type { JSX } from 'react';
import { composeClassName } from './class-name.utils';
import {
  BONFIRE_FLICKER_CLASS,
  BONFIRE_PLACEMENTS,
  FLAME_GLOW_CLASS,
  FLAME_LAYER_PATHS,
  FLAME_LAYERS,
  FLAME_MARK_PIXELS,
  type FlameMarkSize,
  type FlameTone,
} from './flame-mark.utils';

export interface BonfireMarkProps {
  readonly tone: FlameTone;
  readonly size?: FlameMarkSize;
  readonly className?: string;
}

// @FollowsBlueprint atom-plain
export function BonfireMark({ tone, size = 'md', className }: BonfireMarkProps): JSX.Element {
  return (
    <svg
      width={FLAME_MARK_PIXELS[size]}
      height={FLAME_MARK_PIXELS[size]}
      viewBox="0 0 24 24"
      overflow="visible"
      data-flame-mark="bonfire"
      data-tone={tone}
      className={composeClassName(
        'inline-block shrink-0',
        FLAME_GLOW_CLASS[tone],
        BONFIRE_FLICKER_CLASS[tone],
        className,
      )}
      aria-hidden="true"
    >
      {BONFIRE_PLACEMENTS.map((placement) => (
        <g key={placement} transform={placement}>
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
        </g>
      ))}
    </svg>
  );
}
