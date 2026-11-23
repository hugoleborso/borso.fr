import { describe, expect, it } from 'vitest';
import type { PirateAvatar } from '@domain/pirate-avatar.core';
import { selectAvataaarsOptions, selectPirateLayers } from './pirate-portrait.core';

const DECKHAND: PirateAvatar = {
  skin: 'dark',
  hair: 'fro',
  hairColor: 'ginger',
  facialHair: 'none',
  expression: 'grin',
  headwear: 'none',
  eyepatch: 'none',
  scar: 'none',
  earring: 'none',
  mouthpiece: 'none',
  companion: 'none',
};

function toothFor(expression: PirateAvatar['expression']) {
  return selectPirateLayers({ ...DECKHAND, expression, mouthpiece: 'goldTooth' });
}

function pipeFor(expression: PirateAvatar['expression']) {
  return selectPirateLayers({ ...DECKHAND, expression, mouthpiece: 'pipe' });
}

// @FollowsBlueprint test-pure-unit
describe('selectAvataaarsOptions', () => {
  it('draws a bare pirate with one fixed choice per part and nothing left to chance', () => {
    expect(selectAvataaarsOptions(DECKHAND)).toEqual({
      seed: 'pirate',
      skinColor: ['614335'],
      top: ['fro'],
      topProbability: 100,
      hairColor: ['c93305'],
      facialHair: [],
      facialHairColor: ['c93305'],
      facialHairProbability: 0,
      eyes: ['default'],
      eyebrows: ['defaultNatural'],
      mouth: ['smile'],
      accessories: [],
      accessoriesProbability: 0,
      clothing: ['shirtVNeck'],
      clothesColor: ['e6e6e6'],
    });
  });

  it('draws no hair at all on a bald pirate', () => {
    const options = selectAvataaarsOptions({ ...DECKHAND, hair: 'bald' });
    expect(options.top).toEqual([]);
    expect(options.topProbability).toBe(0);
  });

  it('cuts hair that would poke through a hat down to a short crop', () => {
    expect(selectAvataaarsOptions({ ...DECKHAND, headwear: 'tricorne' }).top).toEqual([
      'theCaesar',
    ]);
    expect(selectAvataaarsOptions({ ...DECKHAND, headwear: 'bandana' }).top).toEqual(['theCaesar']);
  });

  it('keeps long hair falling under a hat', () => {
    expect(selectAvataaarsOptions({ ...DECKHAND, hair: 'long', headwear: 'tricorne' }).top).toEqual(
      ['longButNotTooLong'],
    );
  });

  it('colours the beard like the hair', () => {
    const options = selectAvataaarsOptions({
      ...DECKHAND,
      hairColor: 'grey',
      facialHair: 'handlebar',
    });
    expect(options.facialHair).toEqual(['moustacheMagnum']);
    expect(options.facialHairColor).toEqual(['e8e1e1']);
    expect(options.facialHairProbability).toBe(100);
  });

  it('puts the eyepatch on when the pirate wears one', () => {
    const options = selectAvataaarsOptions({ ...DECKHAND, eyepatch: 'patch' });
    expect(options.accessories).toEqual(['eyepatch']);
    expect(options.accessoriesProbability).toBe(100);
  });

  it('turns an expression into one set of eyes, brows and mouth', () => {
    const options = selectAvataaarsOptions({ ...DECKHAND, expression: 'fierce' });
    expect([options.eyes, options.eyebrows, options.mouth]).toEqual([
      ['squint'],
      ['angryNatural'],
      ['grimace'],
    ]);
  });
});

describe('selectPirateLayers', () => {
  it('draws nothing over a pirate who wears none of our parts', () => {
    expect(selectPirateLayers(DECKHAND)).toEqual([]);
  });

  it('stacks scars under the mouth, the earring, the hat and then the parrot', () => {
    expect(
      selectPirateLayers({
        ...DECKHAND,
        scar: 'eye',
        mouthpiece: 'pipe',
        earring: 'hoop',
        headwear: 'bandana',
        companion: 'parrot',
      }),
    ).toEqual(['eyeScar', 'pipeSmile', 'hoop', 'bandana', 'parrot']);
  });

  it('draws the cheek scar and the tricorne each as their own layer', () => {
    expect(selectPirateLayers({ ...DECKHAND, scar: 'cheek', headwear: 'tricorne' })).toEqual([
      'cheekScar',
      'tricorne',
    ]);
  });

  it('sets the gold tooth into whichever mouth the expression opens', () => {
    expect(toothFor('wink')).toEqual(['goldToothSmile']);
    expect(toothFor('fierce')).toEqual(['goldToothGrimace']);
    expect(toothFor('roar')).toEqual(['goldToothScream']);
  });

  it('puts the pipe in the corner of whichever mouth the expression opens', () => {
    expect(pipeFor('cheerful')).toEqual(['pipeSmile']);
    expect(pipeFor('fierce')).toEqual(['pipeGrimace']);
    expect(pipeFor('roar')).toEqual(['pipeScream']);
  });
});
