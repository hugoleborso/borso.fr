import type { PirateAvatar } from '@domain/pirate-avatar.core';
import type { PlayerColor } from '@domain/player-mark.core';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { PlayerMark, type PlayerMarkEmphasis, type PlayerMarkSize } from './PlayerMark';

const LAYOUTS = {
  beside: { root: 'flex min-w-0 flex-1 items-center', text: 'flex min-w-0 flex-1 flex-col gap-1' },
  under: { root: 'flex min-w-0 max-w-full flex-col items-center', text: 'flex max-w-full' },
} as const;

const GAPS: Readonly<Record<PlayerMarkSize, string>> = {
  tiny: 'gap-1',
  small: 'gap-2.5',
  medium: 'gap-1',
  large: 'gap-3',
  big: 'gap-1.5',
  hero: 'gap-4',
};

const NAME_STYLES = {
  caption: 'text-xs font-semibold',
  label: 'text-sm font-semibold',
  title: 'font-display text-3xl leading-none',
  headline: 'font-display text-4xl',
} as const;

const NAME_TONES: Readonly<Record<PlayerMarkEmphasis, string>> = {
  plain: 'text-text',
  ringed: 'text-text',
  faded: 'text-muted-2',
};

export interface NamedMarkProps {
  readonly avatar: PirateAvatar;
  readonly color: PlayerColor;
  readonly name: string;
  readonly size: PlayerMarkSize;
  readonly layout: keyof typeof LAYOUTS;
  readonly nameStyle: keyof typeof NAME_STYLES;
  readonly emphasis?: PlayerMarkEmphasis;
  readonly children?: ReactNode;
}

// @FollowsBlueprint atom-variant-table
export function NamedMark({
  avatar,
  color,
  name,
  size,
  layout,
  nameStyle,
  emphasis = 'plain',
  children,
}: NamedMarkProps) {
  return (
    <span className={clsx(LAYOUTS[layout].root, GAPS[size])}>
      <PlayerMark avatar={avatar} color={color} size={size} emphasis={emphasis} />
      <span className={LAYOUTS[layout].text}>
        <span className={clsx('min-w-0 truncate', NAME_STYLES[nameStyle], NAME_TONES[emphasis])}>
          {name}
        </span>
        {children}
      </span>
    </span>
  );
}
