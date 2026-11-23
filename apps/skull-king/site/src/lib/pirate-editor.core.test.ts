import { describe, expect, it } from 'vitest';
import {
  COMPANIONS,
  FACIAL_HAIRS,
  HAIR_STYLES,
  type PirateAvatar,
  suggestAvatar,
} from '@domain/pirate-avatar.core';
import { stepChoice, stepPiratePart } from './pirate-editor.core';

const BARE: PirateAvatar = {
  ...suggestAvatar(0),
  hair: 'crop',
  facialHair: 'none',
  companion: 'none',
};

// @FollowsBlueprint test-pure-unit
describe('stepPiratePart', () => {
  it('moves one part to its next choice and leaves every other part alone', () => {
    expect(stepPiratePart(BARE, 'hair', 1)).toEqual({ ...BARE, hair: HAIR_STYLES[2] });
  });

  it('moves one part back to its previous choice', () => {
    expect(stepPiratePart(BARE, 'hair', -1)).toEqual({ ...BARE, hair: HAIR_STYLES[0] });
  });

  it('wraps from the last choice to the first, and from the first to the last', () => {
    const lastBeard = FACIAL_HAIRS.at(-1) ?? 'none';
    expect(stepPiratePart({ ...BARE, facialHair: lastBeard }, 'facialHair', 1).facialHair).toBe(
      'none',
    );
    expect(stepPiratePart(BARE, 'facialHair', -1).facialHair).toBe(lastBeard);
  });

  it('toggles a part with two choices either way', () => {
    expect(stepPiratePart(BARE, 'companion', 1).companion).toBe(COMPANIONS[1]);
    expect(stepPiratePart(BARE, 'companion', -1).companion).toBe(COMPANIONS[1]);
  });
});

describe('stepChoice', () => {
  it('keeps the current value when there is nothing to step through', () => {
    expect(stepChoice([], 'crop', 1)).toBe('crop');
  });
});
