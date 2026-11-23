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
  'cheekScar',
  'eyeScar',
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

const SCAR_LAYERS = {
  none: [],
  cheek: ['cheekScar'],
  eye: ['eyeScar'],
} as const satisfies Readonly<Record<PirateAvatar['scar'], readonly PirateLayer[]>>;

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
    ...SCAR_LAYERS[avatar.scar],
    ...selectMouthpieceLayers(avatar),
    ...EARRING_LAYERS[avatar.earring],
    ...HEADWEAR_LAYERS[avatar.headwear],
    ...COMPANION_LAYERS[avatar.companion],
  ];
}
