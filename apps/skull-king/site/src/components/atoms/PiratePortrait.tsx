import { avataaars } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import type { ReactElement } from 'react';
import type { PirateAvatar } from '@domain/pirate-avatar.core';
import {
  type PirateLayer,
  selectAvataaarsOptions,
  selectPirateLayers,
} from '@site/lib/pirate-portrait.core';

const AVATAAARS_SIZE = 280;
const FRAME = '24 6 232 232';

const GOLD = '#F0B429';
const GOLD_SHINE = '#FFE9A8';
const SCAR_LINE = '#8E2A35';
const SCAR_HALO = '#F6C9C4';
const FELT = '#262E33';
const BANDANA = '#D0353F';
const PIPE_WOOD = '#8A5428';
const PIPE_STEM = '#4A2C14';
const MACAW_RED = '#E0393E';
const MACAW_YELLOW = '#F6C343';
const MACAW_BLUE = '#2F6FD1';
const BONE = '#F3EFE6';
const INK = '#1B1B1B';

const scar = (line: string, stitches: string) => (
  <g strokeLinecap="round" fill="none">
    <path d={line} stroke={SCAR_HALO} strokeOpacity=".7" strokeWidth="5" />
    <path d={line} stroke={SCAR_LINE} strokeOpacity=".75" strokeWidth="2.4" />
    <path d={stitches} stroke={SCAR_LINE} strokeOpacity=".75" strokeWidth="1.8" />
  </g>
);

const goldTooth = (tooth: string, shine: string) => (
  <>
    <path d={tooth} fill={GOLD} />
    <path d={shine} stroke={GOLD_SHINE} strokeWidth="1.3" strokeLinecap="round" />
  </>
);

interface Shift {
  readonly x: number;
  readonly y: number;
}

const PIPE_SHIFTS = {
  smile: { x: 0, y: 0 },
  grimace: { x: 14, y: 5 },
  scream: { x: 2, y: 13 },
} as const satisfies Readonly<Record<string, Shift>>;

const pipe = (shift: Shift) => (
  <g transform={`translate(${shift.x} ${shift.y})`}>
    <path d="M155 149.5l25 9.5" stroke={PIPE_STEM} strokeWidth="4.5" strokeLinecap="round" />
    <path d="M176 149h22v10a11 11 0 0 1-22 0Z" fill={PIPE_WOOD} />
    <path
      d="M187 170a11 11 0 0 0 11-11v-10h-5v10a11 11 0 0 1-8.4 10.7c.8.2 1.6.3 2.4.3Z"
      fill="#000"
      fillOpacity=".2"
    />
    <rect x="175" y="146.5" width="24" height="5" rx="2.5" fill={PIPE_STEM} />
    <path
      d="M190 140c-3.5-3.5 3.5-6.5 0-10s3.5-6.5 0-10"
      stroke="#fff"
      strokeOpacity=".75"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    />
  </g>
);

const LAYER_ART: Readonly<Record<PirateLayer, ReactElement>> = {
  cheekScar: scar('M164 123l21 16', 'M166 129.5l5-6.6M172.5 134.4l5-6.6M179 139.3l5-6.6'),
  eyeScar: scar('M155 84l16 50', 'M155.1 95l6.2-2M164.7 125l6.2-2M166.9 132l6.2-2'),
  goldToothSmile: goldTooth('M143.5 147.2h7v3.6a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2Z', 'M145.2 148.6v2'),
  goldToothGrimace: goldTooth('M148.6 143.6h7.8v8.3h-7.8Z', 'M150.4 145.2v4.6'),
  goldToothScream: goldTooth('M142.4 147.4h6v4.6h-6Z', 'M144 148.6v2.2'),
  pipeSmile: pipe(PIPE_SHIFTS.smile),
  pipeGrimace: pipe(PIPE_SHIFTS.grimace),
  pipeScream: pipe(PIPE_SHIFTS.scream),
  hoop: (
    <>
      <circle cx="80" cy="146" r="9" stroke={GOLD} strokeWidth="3.6" fill="none" />
      <path
        d="M73.8 141.6a7.6 7.6 0 0 1 4.4-4.3"
        stroke={GOLD_SHINE}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  tricorne: (
    <>
      <path d="M88 58c0-28 22-44 52-44s52 16 52 44Z" fill={FELT} />
      <path
        d="M88 58c0-5 .7-9.8 2-14.3 30 5.6 70 5.6 100 0 1.3 4.5 2 9.3 2 14.3Z"
        fill="#000"
        fillOpacity=".25"
      />
      <path
        d="M48 42c28 12 62 12 92 2 30 10 64 10 92-2-7 16-25 25-48 28-17 2-32 7-44 15-12-8-27-13-44-15-23-3-41-12-48-28Z"
        fill={FELT}
      />
      <path
        d="M56 55c8 6 19 10 33 12 18 2 38 7 51 15 13-8 33-13 51-15 14-2 25-6 33-12-7 8-18 14-33 16-18 2-37 7-51 17-14-10-33-15-51-17-15-2-26-8-33-16Z"
        fill="#000"
        fillOpacity=".3"
      />
      <path
        d="M48 42c28 12 62 12 92 2 30 10 64 10 92-2"
        stroke={GOLD}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="140" cy="59" r="7.5" fill={BONE} />
      <rect x="135.5" y="62" width="9" height="6.5" rx="2" fill={BONE} />
      <circle cx="137.2" cy="59.2" r="2" fill={FELT} />
      <circle cx="142.8" cy="59.2" r="2" fill={FELT} />
      <path d="M127 72l26-6M127 66l26 6" stroke={BONE} strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  bandana: (
    <>
      <path
        d="M82 88c-4-34 22-58 58-58s62 24 58 58c-18-14-38-20-58-20s-40 6-58 20Z"
        fill={BANDANA}
      />
      <path
        d="M82 88c-.6-5-.6-9.8 0-14.4C100 62 120 56 140 56s40 6 58 17.6c.6 4.6.6 9.4 0 14.4-18-14-38-20-58-20s-40 6-58 20Z"
        fill="#000"
        fillOpacity=".15"
      />
      <g fill="#fff" fillOpacity=".9">
        <circle cx="118" cy="44" r="3.2" />
        <circle cx="146" cy="40" r="3.2" />
        <circle cx="172" cy="48" r="3.2" />
        <circle cx="100" cy="62" r="3.2" />
        <circle cx="132" cy="58" r="3.2" />
        <circle cx="160" cy="62" r="3.2" />
        <circle cx="186" cy="68" r="3.2" />
      </g>
      <path d="M197 76c7 10 12 22 14 36l-9 2c-2-13-5-24-11-33Z" fill={BANDANA} />
      <path d="M200 74c11 6 19 16 24 28l-8 4c-5-11-12-19-21-25Z" fill={BANDANA} />
      <path d="M200 74c11 6 19 16 24 28l-8 4c-5-11-12-19-21-25Z" fill="#000" fillOpacity=".15" />
      <ellipse cx="199" cy="76" rx="7" ry="8" fill={BANDANA} />
      <ellipse cx="199" cy="76" rx="7" ry="8" fill="#000" fillOpacity=".1" />
    </>
  ),
  parrot: (
    <g transform="translate(-12 -10)">
      <path d="M226 200c10 14 18 30 19 48l-8 2c-4-18-11-33-19-44Z" fill={MACAW_BLUE} />
      <path d="M222 202c6 14 9 28 9 44l-7 1c-1-16-4-29-10-40Z" fill={MACAW_RED} />
      <path d="M212 166c-9 14-8 38 7 48 15 9 26-4 24-22-2-16-12-28-23-30Z" fill={MACAW_RED} />
      <path
        d="M212 166c-9 14-8 38 7 48 6 3.6 11.6 3.4 15.8.4C222 210 212 194 212 166Z"
        fill="#000"
        fillOpacity=".12"
      />
      <path d="M227 176c12 4 18 20 14 38-4 8-12 8-16 0-4-12-4-28 2-38Z" fill={MACAW_YELLOW} />
      <path d="M224.6 205c5 8 11 14 16.4 9 0 8-4 18-10 20-4-8-6-18-6.4-29Z" fill={MACAW_BLUE} />
      <circle cx="216" cy="156" r="13" fill={MACAW_RED} />
      <ellipse cx="210.5" cy="157" rx="6" ry="7" fill={BONE} />
      <circle cx="210.5" cy="155" r="2.3" fill={INK} />
      <circle cx="209.8" cy="154.2" r=".8" fill="#fff" />
      <path d="M205 151c-8 0-11 8-8 15 2-4 5-6 9-6Z" fill={BONE} />
      <path d="M206 160c-4 1-6 4-5 7 3 1 6-1 7-4Z" fill={INK} />
      <path d="M214 213l-3 5M220 215l-1 5" stroke="#5C5C5C" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
};

export interface PiratePortraitProps {
  readonly avatar: PirateAvatar;
  readonly className?: string;
}

// @FollowsBlueprint atom-generated-illustration
export function PiratePortrait({ avatar, className }: PiratePortraitProps) {
  const base = createAvatar(avataaars, selectAvataaarsOptions(avatar)).toDataUri();
  return (
    <svg viewBox={FRAME} className={className} aria-hidden="true" focusable="false">
      <image href={base} width={AVATAAARS_SIZE} height={AVATAAARS_SIZE} />
      {selectPirateLayers(avatar).map((layer) => (
        <g key={layer}>{LAYER_ART[layer]}</g>
      ))}
    </svg>
  );
}
