import type { PirateAvatar } from '@domain/pirate-avatar.core';
import type { PlayerColor } from '@domain/player-mark.core';
import clsx from 'clsx';
import { PiratePortrait } from './PiratePortrait';

const COLOR_FILLS: Readonly<Record<PlayerColor, string>> = {
  gold: 'bg-mark-gold',
  sky: 'bg-mark-sky',
  magenta: 'bg-mark-magenta',
  ice: 'bg-mark-ice',
  amethyst: 'bg-mark-amethyst',
  sand: 'bg-mark-sand',
  indigo: 'bg-mark-indigo',
  slate: 'bg-mark-slate',
};

const COLOR_RINGS: Readonly<Record<PlayerColor, string>> = {
  gold: 'ring-mark-gold',
  sky: 'ring-mark-sky',
  magenta: 'ring-mark-magenta',
  ice: 'ring-mark-ice',
  amethyst: 'ring-mark-amethyst',
  sand: 'ring-mark-sand',
  indigo: 'ring-mark-indigo',
  slate: 'ring-mark-slate',
};

const SIZES = {
  tiny: 'size-6',
  small: 'size-10',
  medium: 'size-11',
  large: 'size-12',
  big: 'size-16',
  hero: 'size-24',
} as const;

export type PlayerMarkSize = keyof typeof SIZES;

const RIMS: Readonly<Record<PlayerMarkSize, string>> = {
  tiny: 'p-0.5',
  small: 'p-0.75',
  medium: 'p-0.75',
  large: 'p-0.75',
  big: 'p-1',
  hero: 'p-1.5',
};

const EMPHASES = {
  plain: '',
  ringed: 'ring-2 ring-offset-3 ring-offset-ground',
  faded: 'opacity-35',
} as const;

export type PlayerMarkEmphasis = keyof typeof EMPHASES;

export interface PlayerMarkProps {
  readonly avatar: PirateAvatar;
  readonly color: PlayerColor;
  readonly size: PlayerMarkSize;
  readonly emphasis?: PlayerMarkEmphasis;
}

// @FollowsBlueprint atom-variant-table
export function PlayerMark({ avatar, color, size, emphasis = 'plain' }: PlayerMarkProps) {
  return (
    <span
      className={clsx(
        'porthole flex shrink-0 rounded-full',
        SIZES[size],
        RIMS[size],
        COLOR_RINGS[color],
        EMPHASES[emphasis],
      )}
    >
      <span
        className={clsx('relative flex size-full overflow-hidden rounded-full', COLOR_FILLS[color])}
      >
        <PiratePortrait avatar={avatar} className="size-full" />
        <span className="porthole-glass pointer-events-none absolute inset-0 rounded-full" />
      </span>
    </span>
  );
}
