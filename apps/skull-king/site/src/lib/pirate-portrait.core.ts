import type { avataaars } from '@dicebear/collection';
import type {
  EXPRESSIONS,
  FACIAL_HAIRS,
  HAIR_COLORS,
  HAIR_STYLES,
  HEADWEARS,
  PirateAvatar,
  SKIN_TONES,
} from '@domain/pirate-avatar.core';

type SkinTone = (typeof SKIN_TONES)[number];
type HairStyle = (typeof HAIR_STYLES)[number];
type HairColor = (typeof HAIR_COLORS)[number];
type FacialHair = (typeof FACIAL_HAIRS)[number];
type Expression = (typeof EXPRESSIONS)[number];
type Headwear = (typeof HEADWEARS)[number];

export const SKIN_HEX = {
  fair: 'ffdbb4',
  light: 'edb98a',
  tan: 'd08b5b',
  brown: 'ae5d29',
  dark: '614335',
} as const satisfies Readonly<Record<SkinTone, string>>;

const HAIR_HEX = {
  black: '2c1b18',
  darkBrown: '4a312c',
  brown: '724133',
  auburn: 'a55728',
  ginger: 'c93305',
  blonde: 'd6b370',
  platinum: 'ecdcbf',
  grey: 'e8e1e1',
} as const satisfies Readonly<Record<HairColor, string>>;

const AVATAAARS_TOP = {
  bald: null,
  crop: 'shortFlat',
  waves: 'shortWaved',
  curls: 'shortCurly',
  caesar: 'theCaesar',
  sides: 'sides',
  mullet: 'shaggyMullet',
  shaggy: 'shaggy',
  long: 'longButNotTooLong',
  dreads: 'dreads01',
  bun: 'bun',
  fro: 'fro',
} as const satisfies Readonly<Record<HairStyle, string | null>>;

const HAIR_UNDER_HEADWEAR = {
  bald: 'bald',
  crop: 'caesar',
  waves: 'caesar',
  curls: 'caesar',
  caesar: 'caesar',
  sides: 'sides',
  mullet: 'caesar',
  shaggy: 'caesar',
  long: 'long',
  dreads: 'caesar',
  bun: 'caesar',
  fro: 'caesar',
} as const satisfies Readonly<Record<HairStyle, HairStyle>>;

const AVATAAARS_FACIAL_HAIR = {
  none: null,
  stubble: 'beardLight',
  beard: 'beardMedium',
  fullBeard: 'beardMajestic',
  moustache: 'moustacheFancy',
  handlebar: 'moustacheMagnum',
} as const satisfies Readonly<Record<FacialHair, string | null>>;

type Mouth = 'smile' | 'grimace' | 'screamOpen';

interface Face {
  readonly eyes: 'default' | 'wink' | 'happy' | 'squint' | 'surprised';
  readonly eyebrows: 'defaultNatural' | 'raisedExcitedNatural' | 'angryNatural';
  readonly mouth: Mouth;
}

const FACES = {
  grin: { eyes: 'default', eyebrows: 'defaultNatural', mouth: 'smile' },
  wink: { eyes: 'wink', eyebrows: 'raisedExcitedNatural', mouth: 'smile' },
  fierce: { eyes: 'squint', eyebrows: 'angryNatural', mouth: 'grimace' },
  roar: { eyes: 'surprised', eyebrows: 'angryNatural', mouth: 'screamOpen' },
  cheerful: { eyes: 'happy', eyebrows: 'defaultNatural', mouth: 'smile' },
} as const satisfies Readonly<Record<Expression, Face>>;

const SHIRT = 'shirtVNeck';
const SHIRT_HEX = 'e6e6e6';
const EVERY_TIME = 100;
const NEVER = 0;

export type AvataaarsOptions = avataaars.Options & { readonly seed: string };

function selectHairShown(hair: HairStyle, headwear: Headwear): HairStyle {
  return headwear === 'none' ? hair : HAIR_UNDER_HEADWEAR[hair];
}

function asChoice<Value extends string>(value: Value | null): Value[] {
  return value === null ? [] : [value];
}

// @FollowsBlueprint core-lookup-table
export function selectAvataaarsOptions(avatar: PirateAvatar): AvataaarsOptions {
  const top = AVATAAARS_TOP[selectHairShown(avatar.hair, avatar.headwear)];
  const facialHair = AVATAAARS_FACIAL_HAIR[avatar.facialHair];
  const face = FACES[avatar.expression];
  const hairHex = HAIR_HEX[avatar.hairColor];
  return {
    seed: 'pirate',
    skinColor: [SKIN_HEX[avatar.skin]],
    top: asChoice(top),
    topProbability: top === null ? NEVER : EVERY_TIME,
    hairColor: [hairHex],
    facialHair: asChoice(facialHair),
    facialHairColor: [hairHex],
    facialHairProbability: facialHair === null ? NEVER : EVERY_TIME,
    eyes: [face.eyes],
    eyebrows: [face.eyebrows],
    mouth: [face.mouth],
    accessories: avatar.eyepatch === 'patch' ? ['eyepatch'] : [],
    accessoriesProbability: avatar.eyepatch === 'patch' ? EVERY_TIME : NEVER,
    clothing: [SHIRT],
    clothesColor: [SHIRT_HEX],
  };
}

export const PIRATE_LAYERS = [
  'goldToothSmile',
  'goldToothGrimace',
  'goldToothScream',
  'pipeSmile',
  'pipeGrimace',
  'pipeScream',
  'hoop',
  'tricorne',
  'bandana',
  'parrot',
] as const;

export type PirateLayer = (typeof PIRATE_LAYERS)[number];

const GOLD_TOOTH_BY_MOUTH = {
  smile: 'goldToothSmile',
  grimace: 'goldToothGrimace',
  screamOpen: 'goldToothScream',
} as const satisfies Readonly<Record<Mouth, PirateLayer>>;

const PIPE_BY_MOUTH = {
  smile: 'pipeSmile',
  grimace: 'pipeGrimace',
  screamOpen: 'pipeScream',
} as const satisfies Readonly<Record<Mouth, PirateLayer>>;

function selectMouthpieceLayers(avatar: PirateAvatar): readonly PirateLayer[] {
  const { mouth } = FACES[avatar.expression];
  const byMouthpiece = {
    none: [],
    goldTooth: [GOLD_TOOTH_BY_MOUTH[mouth]],
    pipe: [PIPE_BY_MOUTH[mouth]],
  } as const satisfies Readonly<Record<PirateAvatar['mouthpiece'], readonly PirateLayer[]>>;
  return byMouthpiece[avatar.mouthpiece];
}

const EARRING_LAYERS = { none: [], hoop: ['hoop'] } as const satisfies Readonly<
  Record<PirateAvatar['earring'], readonly PirateLayer[]>
>;

const HEADWEAR_LAYERS = {
  none: [],
  tricorne: ['tricorne'],
  bandana: ['bandana'],
} as const satisfies Readonly<Record<Headwear, readonly PirateLayer[]>>;

const COMPANION_LAYERS = { none: [], parrot: ['parrot'] } as const satisfies Readonly<
  Record<PirateAvatar['companion'], readonly PirateLayer[]>
>;

export function selectPirateLayers(avatar: PirateAvatar): readonly PirateLayer[] {
  return [
    ...selectMouthpieceLayers(avatar),
    ...EARRING_LAYERS[avatar.earring],
    ...HEADWEAR_LAYERS[avatar.headwear],
    ...COMPANION_LAYERS[avatar.companion],
  ];
}

const HAIR_LAYER = '<g transform="translate(-1)">';
const AVATAAARS_SHIFT = 'translate(-8)';
const SCAR_LINE = '#8E2A35';
const SCAR_HALO = '#F6C9C4';
const CHEEK_SCAR_LINE = 'M164 123l21 16';
const CHEEK_SCAR_STITCHES = 'M166 129.5l5-6.6M172.5 134.4l5-6.6M179 139.3l5-6.6';
const STITCHED_WOUND =
  'M135.688 14.47c-9.9 17.578-16.9 35.042-21.157 52.718c-30 .05-60.354 6.118-90.25 19.343c30.206-1.245 58.853 1.256 85.94 7.064c-1.807 20.477-.167 41.44 4.718 63.406c8.715-19.5 14.788-38.61 18.562-57.5c19.888 5.854 38.888 13.542 57 22.906c-8.706 21.313-15.625 43.75-20.906 65.813c17.15-14.825 32.1-32.532 43.937-52.72c16.033 9.956 31.312 21.258 45.845 33.78c-14.894 18.655-26.555 39.646-35.5 63.032c20.666-12.887 40.305-26.64 58.344-41.718c11.776 11.827 23.03 24.468 33.717 37.875c-18.05 13.51-34.525 29.52-50.093 47.874c23.34-7.02 45.913-15.17 67.25-25.03c9.88 13.904 19.248 28.47 28.094 43.624c-19.928 10.57-37.594 24.166-54.032 40.218c22.827-4.56 45.175-10.16 66.75-17.312a719 719 0 0 1 23.938 49.625c-17.376 5.93-34.2 14.867-50.75 26.624c19.95-1.098 39.803-2.813 59.344-6.094c12.852 31.89 23.956 65.24 33.28 99.5c6.136-34.692 5.34-70.76-1.156-106.563c15.952-4.408 31.63-10.26 46.938-18.093c-17.955-3.76-35.026-4.77-51.47-3.22c-4.788-19.56-11.22-38.93-19.124-57.843c19.266-8.834 37.666-19.323 54.97-31.905c-24.416.075-46.115 2.948-65.75 8.22c-8.473-17.198-18.144-33.875-28.845-49.845c20.15-13.046 38.63-28.44 54.876-46.906c-27.136 4.322-51.12 11.75-72.812 22.062c-12.598-16.215-26.287-31.466-40.875-45.47c16.55-18.2 30.804-38.286 42.03-60.842c-25.817 10.962-47.79 24.042-66.438 39.25c-19.178-15.557-39.573-28.977-60.812-39.75c6.06-17.92 9.95-37.2 11.156-57.656c-13.128 13.28-24.6 29.352-34.5 47.062c-22.77-9.18-46.31-15.263-70.22-17.656c1.253-18.045.512-35.955-2-53.875z';

const SCAR_ART = {
  none: '',
  cheek: `<g stroke-linecap="round" fill="none"><path d="${CHEEK_SCAR_LINE}" stroke="${SCAR_HALO}" stroke-opacity=".7" stroke-width="5"/><path d="${CHEEK_SCAR_LINE}" stroke="${SCAR_LINE}" stroke-opacity=".75" stroke-width="2.4"/><path d="${CHEEK_SCAR_STITCHES}" stroke="${SCAR_LINE}" stroke-opacity=".75" stroke-width="1.8"/></g>`,
  eye: `<svg x="140" y="88" width="52" height="52" viewBox="0 0 512 512" opacity=".8"><path fill="${SCAR_LINE}" d="${STITCHED_WOUND}"/></svg>`,
} as const satisfies Readonly<Record<PirateAvatar['scar'], string>>;

export function paintScarUnderHair(avataaarsSvg: string, scar: PirateAvatar['scar']): string {
  const art = SCAR_ART[scar];
  if (art === '' || !avataaarsSvg.includes(HAIR_LAYER)) return avataaarsSvg;
  return avataaarsSvg.replace(
    HAIR_LAYER,
    `<g transform="${AVATAAARS_SHIFT}">${art}</g>${HAIR_LAYER}`,
  );
}
