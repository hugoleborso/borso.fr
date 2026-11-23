import { describe, expect, it } from 'vitest';
import {
  HAIR_STYLES,
  isSameAvatar,
  PIRATE_PART_CHOICES,
  PIRATE_PARTS,
  type PirateAvatar,
  pirateAvatarSchema,
  readStoredAvatar,
  suggestAvatar,
} from './pirate-avatar.core';

const SEATS_AT_A_FULL_TABLE = 8;

const CAPTAIN: PirateAvatar = {
  skin: 'tan',
  hair: 'long',
  hairColor: 'ginger',
  facialHair: 'fullBeard',
  expression: 'roar',
  headwear: 'tricorne',
  eyepatch: 'patch',
  scar: 'eye',
  earring: 'hoop',
  mouthpiece: 'pipe',
  companion: 'parrot',
};

// @FollowsBlueprint test-pure-unit
describe('suggestAvatar', () => {
  it('dresses the first two seats as two set pirates', () => {
    expect(suggestAvatar(0)).toEqual({
      skin: 'fair',
      hair: 'sides',
      hairColor: 'black',
      facialHair: 'beard',
      expression: 'grin',
      headwear: 'tricorne',
      eyepatch: 'none',
      scar: 'eye',
      earring: 'hoop',
      mouthpiece: 'none',
      companion: 'none',
    });
    expect(suggestAvatar(1)).toEqual({
      skin: 'tan',
      hair: 'bun',
      hairColor: 'auburn',
      facialHair: 'fullBeard',
      expression: 'fierce',
      headwear: 'bandana',
      eyepatch: 'patch',
      scar: 'cheek',
      earring: 'none',
      mouthpiece: 'pipe',
      companion: 'parrot',
    });
  });

  it('gives every seat of a full table a different pirate', () => {
    const seats = Array.from({ length: SEATS_AT_A_FULL_TABLE }, (_, seat) => suggestAvatar(seat));
    const distinct = new Set(seats.map((avatar) => JSON.stringify(avatar)));
    expect(distinct.size).toBe(SEATS_AT_A_FULL_TABLE);
  });

  it('suggests only choices the schema accepts, for any seat', () => {
    for (let seat = 0; seat < 40; seat += 1) {
      expect(pirateAvatarSchema.safeParse(suggestAvatar(seat)).success).toBe(true);
    }
  });

  it('falls back to the first choice of a part for a seat outside the table', () => {
    expect(suggestAvatar(-1).skin).toBe('fair');
    expect(suggestAvatar(-1).hair).toBe(HAIR_STYLES[0]);
  });
});

describe('readStoredAvatar', () => {
  it('reads back a pirate the column stored', () => {
    expect(readStoredAvatar(JSON.stringify(CAPTAIN), 3)).toEqual(CAPTAIN);
  });

  it('suggests the pirate of the seat for a row written before avatars existed', () => {
    expect(readStoredAvatar(null, 2)).toEqual(suggestAvatar(2));
  });

  it('suggests the pirate of the seat for text that is not JSON', () => {
    expect(readStoredAvatar('{not json', 4)).toEqual(suggestAvatar(4));
  });

  it('suggests the pirate of the seat for a stored part a later version no longer offers', () => {
    expect(readStoredAvatar(JSON.stringify({ ...CAPTAIN, hair: 'mohawk' }), 5)).toEqual(
      suggestAvatar(5),
    );
  });
});

describe('isSameAvatar', () => {
  it('treats two pirates with the same parts as the same', () => {
    expect(isSameAvatar(CAPTAIN, { ...CAPTAIN })).toBe(true);
  });

  it('tells two pirates apart by any single part', () => {
    for (const part of PIRATE_PARTS) {
      const other = PIRATE_PART_CHOICES[part].find((choice) => choice !== CAPTAIN[part]);
      expect(isSameAvatar(CAPTAIN, { ...CAPTAIN, [part]: other })).toBe(false);
    }
  });
});

describe('pirateAvatarSchema', () => {
  it('refuses a part it does not know', () => {
    expect(pirateAvatarSchema.safeParse({ ...CAPTAIN, cutlass: 'yes' }).success).toBe(false);
  });
});
