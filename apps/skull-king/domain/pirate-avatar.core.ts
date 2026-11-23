import { z } from 'zod';

export const SKIN_TONES = ['fair', 'light', 'tan', 'brown', 'dark'] as const;

export const HAIR_STYLES = [
  'bald',
  'crop',
  'waves',
  'curls',
  'caesar',
  'sides',
  'mullet',
  'shaggy',
  'long',
  'dreads',
  'bun',
  'fro',
] as const;

export const HAIR_COLORS = [
  'black',
  'darkBrown',
  'brown',
  'auburn',
  'ginger',
  'blonde',
  'platinum',
  'grey',
] as const;

export const FACIAL_HAIRS = [
  'none',
  'stubble',
  'beard',
  'fullBeard',
  'moustache',
  'handlebar',
] as const;

export const EXPRESSIONS = ['grin', 'wink', 'fierce', 'roar', 'cheerful'] as const;

export const HEADWEARS = ['none', 'tricorne', 'bandana'] as const;

export const EYEPATCHES = ['none', 'patch'] as const;

export const SCARS = ['none', 'cheek', 'eye'] as const;

export const EARRINGS = ['none', 'hoop'] as const;

export const MOUTHPIECES = ['none', 'goldTooth', 'pipe'] as const;

export const COMPANIONS = ['none', 'parrot'] as const;

export const pirateAvatarSchema = z
  .object({
    skin: z.enum(SKIN_TONES),
    hair: z.enum(HAIR_STYLES),
    hairColor: z.enum(HAIR_COLORS),
    facialHair: z.enum(FACIAL_HAIRS),
    expression: z.enum(EXPRESSIONS),
    headwear: z.enum(HEADWEARS),
    eyepatch: z.enum(EYEPATCHES),
    scar: z.enum(SCARS),
    earring: z.enum(EARRINGS),
    mouthpiece: z.enum(MOUTHPIECES),
    companion: z.enum(COMPANIONS),
  })
  .strict();

export type PirateAvatar = z.infer<typeof pirateAvatarSchema>;

export type PiratePart = keyof PirateAvatar;

export const PIRATE_PART_CHOICES = {
  skin: SKIN_TONES,
  hair: HAIR_STYLES,
  hairColor: HAIR_COLORS,
  facialHair: FACIAL_HAIRS,
  expression: EXPRESSIONS,
  headwear: HEADWEARS,
  eyepatch: EYEPATCHES,
  scar: SCARS,
  earring: EARRINGS,
  mouthpiece: MOUTHPIECES,
  companion: COMPANIONS,
} as const satisfies { readonly [Part in PiratePart]: readonly PirateAvatar[Part][] };

const PIRATE_PART_KEYS = {
  skin: 'skin',
  hair: 'hair',
  hairColor: 'hairColor',
  facialHair: 'facialHair',
  expression: 'expression',
  headwear: 'headwear',
  eyepatch: 'eyepatch',
  scar: 'scar',
  earring: 'earring',
  mouthpiece: 'mouthpiece',
  companion: 'companion',
} as const satisfies Readonly<Record<PiratePart, PiratePart>>;

export const PIRATE_PARTS: readonly PiratePart[] = Object.values(PIRATE_PART_KEYS);

interface SeatPick {
  readonly stride: number;
  readonly shift: number;
}

const SEAT_PICKS = {
  skin: { stride: 2, shift: 0 },
  hair: { stride: 5, shift: 1 },
  hairColor: { stride: 3, shift: 0 },
  facialHair: { stride: 1, shift: 2 },
  expression: { stride: 2, shift: 0 },
  headwear: { stride: 1, shift: 1 },
  eyepatch: { stride: 1, shift: 0 },
  scar: { stride: 2, shift: 1 },
  earring: { stride: 1, shift: 1 },
  mouthpiece: { stride: 2, shift: 0 },
  companion: { stride: 3, shift: 0 },
} as const satisfies Readonly<Record<PiratePart, SeatPick>>;

function pickForSeat<Choice>(
  choices: readonly [Choice, ...Choice[]],
  seat: number,
  pick: SeatPick,
): Choice {
  return choices[((seat + pick.shift) * pick.stride) % choices.length] ?? choices[0];
}

// @FollowsBlueprint domain-shared-selection
export function suggestAvatar(seat: number): PirateAvatar {
  return {
    skin: pickForSeat(SKIN_TONES, seat, SEAT_PICKS.skin),
    hair: pickForSeat(HAIR_STYLES, seat, SEAT_PICKS.hair),
    hairColor: pickForSeat(HAIR_COLORS, seat, SEAT_PICKS.hairColor),
    facialHair: pickForSeat(FACIAL_HAIRS, seat, SEAT_PICKS.facialHair),
    expression: pickForSeat(EXPRESSIONS, seat, SEAT_PICKS.expression),
    headwear: pickForSeat(HEADWEARS, seat, SEAT_PICKS.headwear),
    eyepatch: pickForSeat(EYEPATCHES, seat, SEAT_PICKS.eyepatch),
    scar: pickForSeat(SCARS, seat, SEAT_PICKS.scar),
    earring: pickForSeat(EARRINGS, seat, SEAT_PICKS.earring),
    mouthpiece: pickForSeat(MOUTHPIECES, seat, SEAT_PICKS.mouthpiece),
    companion: pickForSeat(COMPANIONS, seat, SEAT_PICKS.companion),
  };
}

export function readStoredAvatar(stored: string | null, seat: number): PirateAvatar {
  try {
    const storedAvatar = pirateAvatarSchema.safeParse(JSON.parse(String(stored)));
    return storedAvatar.success ? storedAvatar.data : suggestAvatar(seat);
  } catch {
    return suggestAvatar(seat);
  }
}

export function isSameAvatar(first: PirateAvatar, second: PirateAvatar): boolean {
  return PIRATE_PARTS.every((part) => first[part] === second[part]);
}
