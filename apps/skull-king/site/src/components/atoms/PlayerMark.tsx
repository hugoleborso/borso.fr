import type { PlayerColor, PlayerIcon } from '@domain/player-mark.core';
import clsx from 'clsx';
import { Glyph } from './Glyph';

const COLOR_BACKGROUNDS: Readonly<Record<PlayerColor, string>> = {
  gold: 'bg-mark-gold ring-mark-gold',
  lagoon: 'bg-mark-lagoon ring-mark-lagoon',
  coral: 'bg-mark-coral ring-mark-coral',
  amethyst: 'bg-mark-amethyst ring-mark-amethyst',
  sky: 'bg-mark-sky ring-mark-sky',
  rose: 'bg-mark-rose ring-mark-rose',
  lime: 'bg-mark-lime ring-mark-lime',
  sand: 'bg-mark-sand ring-mark-sand',
};

const SIZES = {
  tiny: { disc: 'size-6', glyph: 'size-3.5 text-ground', stroke: 2.5 },
  small: { disc: 'size-10', glyph: 'size-5.5 text-ground', stroke: 2 },
  medium: { disc: 'size-11', glyph: 'size-6 text-ground', stroke: 2 },
  large: { disc: 'size-12', glyph: 'size-6 text-ground', stroke: 2 },
  big: { disc: 'size-16', glyph: 'size-7.5 text-ground', stroke: 2 },
  hero: { disc: 'size-24', glyph: 'size-12 text-ground', stroke: 1.8 },
} as const;

export type PlayerMarkSize = keyof typeof SIZES;

const EMPHASES = {
  plain: '',
  ringed: 'ring-2 ring-offset-3 ring-offset-ground',
  faded: 'opacity-35',
} as const;

export type PlayerMarkEmphasis = keyof typeof EMPHASES;

export interface PlayerMarkProps {
  readonly icon: PlayerIcon;
  readonly color: PlayerColor;
  readonly size: PlayerMarkSize;
  readonly emphasis?: PlayerMarkEmphasis;
}

// @FollowsBlueprint atom-variant-table
export function PlayerMark({ icon, color, size, emphasis = 'plain' }: PlayerMarkProps) {
  return (
    <span
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-full',
        SIZES[size].disc,
        COLOR_BACKGROUNDS[color],
        EMPHASES[emphasis],
      )}
    >
      <Glyph name={icon} className={SIZES[size].glyph} strokeWidth={SIZES[size].stroke} />
    </span>
  );
}
