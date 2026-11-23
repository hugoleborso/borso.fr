import type { PirateAvatar } from '@domain/pirate-avatar.core';
import type { PlayerColor } from '@domain/player-mark.core';
import clsx from 'clsx';
import { PiratePortrait } from './PiratePortrait';

const COLOR_BACKGROUNDS: Readonly<Record<PlayerColor, string>> = {
  gold: 'bg-mark-gold ring-mark-gold',
  sky: 'bg-mark-sky ring-mark-sky',
  magenta: 'bg-mark-magenta ring-mark-magenta',
  ice: 'bg-mark-ice ring-mark-ice',
  amethyst: 'bg-mark-amethyst ring-mark-amethyst',
  sand: 'bg-mark-sand ring-mark-sand',
  indigo: 'bg-mark-indigo ring-mark-indigo',
  slate: 'bg-mark-slate ring-mark-slate',
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
        'flex shrink-0 overflow-hidden rounded-full',
        SIZES[size],
        COLOR_BACKGROUNDS[color],
        EMPHASES[emphasis],
      )}
    >
      <PiratePortrait avatar={avatar} className="size-full" />
    </span>
  );
}
