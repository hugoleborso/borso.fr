import type { PlayerColor, PlayerIcon } from '@domain/player-mark.core';
import clsx from 'clsx';

const ICON_PATHS: Readonly<Record<PlayerIcon, string>> = {
  skull:
    'M12 3c-4 0-7 3-7 7 0 2 1 3.5 2.5 4.5V18h9v-3.5C18 13.5 19 12 19 10c0-4-3-7-7-7Z M8.2 10.5a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0 M13.2 10.5a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0 M10 18v3M14 18v3',
  parrot:
    'M9 21c0-4 1-7 3-9 M12 12c-3 0-5-2-5-5a4 4 0 0 1 8 0c0 1 0 2-1 3l3 2-3 1 M10.4 7a0.6 0.6 0 1 0 1.2 0a0.6 0.6 0 1 0 -1.2 0',
  anchor: 'M10 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M12 7v14M7 10h10M5 14a7 7 0 0 0 14 0',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
  wheel:
    'M7 12a5 5 0 1 0 10 0a5 5 0 1 0 -10 0 M10.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0 M12 2v5M12 17v5M2 12h5M17 12h5',
  kraken:
    'M6 12a6 6 0 0 1 12 0v1c0 2-1 3-1 5s1 3 2 3 M6 13c0 2 1 3 1 5s-1 3-2 3 M10 15v3c0 1-1 2-1 3 M14 15v3c0 1 1 2 1 3 M9.2 10a0.8 0.8 0 1 0 1.6 0a0.8 0.8 0 1 0 -1.6 0 M13.2 10a0.8 0.8 0 1 0 1.6 0a0.8 0.8 0 1 0 -1.6 0',
  chest: 'M3 11h18v9H3z M3 11c0-3.5 4-6 9-6s9 2.5 9 6 M3 15h18 M11 14h2v3h-2z',
  compass: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M15.5 8.5l-2 5-5 2 2-5z',
  swords: 'M4 4l12 12M14 18l4-4M16 16l3 3M20 4 8 16M6 14l4 4M8 16l-3 3',
  hook: 'M14 3v9a4 4 0 1 1-4-4 M11 3h6',
  bottle: 'M10 2h4M10.5 2v5L8 10v11h8V10l-2.5-3V2 M8 14h8',
  spyglass: 'M3 15 16 8l2 4-13 7z M16 8l3-1.5 2 4-3 1.5 M10 17l-2 4M12 16l2 5',
};

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
  tiny: { disc: 'size-6', glyph: 'size-3.5', stroke: '2.5' },
  small: { disc: 'size-10', glyph: 'size-5.5', stroke: '2' },
  medium: { disc: 'size-11', glyph: 'size-6', stroke: '2' },
  large: { disc: 'size-12', glyph: 'size-6', stroke: '2' },
  big: { disc: 'size-16', glyph: 'size-7.5', stroke: '2' },
  hero: { disc: 'size-24', glyph: 'size-12', stroke: '1.8' },
} as const;

const EMPHASES = {
  plain: '',
  ringed: 'ring-2 ring-offset-3 ring-offset-ground',
  faded: 'opacity-35',
} as const;

export interface PlayerMarkProps {
  readonly icon: PlayerIcon;
  readonly color: PlayerColor;
  readonly size: keyof typeof SIZES;
  readonly emphasis?: keyof typeof EMPHASES;
}

// @FollowsBlueprint atom-generated-illustration
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
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={SIZES[size].stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={clsx('text-ground', SIZES[size].glyph)}
      >
        <path d={ICON_PATHS[icon]} />
      </svg>
    </span>
  );
}
