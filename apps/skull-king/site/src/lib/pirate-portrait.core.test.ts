import { describe, expect, it } from 'vitest';
import type { PirateAvatar } from '@domain/pirate-avatar.core';
import {
  paintScarUnderEyesAndHair,
  selectAvataaarsOptions,
  selectPirateLayers,
} from './pirate-portrait.core';

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

  it('stacks the mouth, the earring, the hat and then the parrot', () => {
    expect(
      selectPirateLayers({
        ...DECKHAND,
        scar: 'eye',
        mouthpiece: 'pipe',
        earring: 'hoop',
        headwear: 'bandana',
        companion: 'parrot',
      }),
    ).toEqual(['pipeSmile', 'hoop', 'bandana', 'parrot']);
  });

  it('draws the tricorne as its own layer and leaves scars to the face', () => {
    expect(selectPirateLayers({ ...DECKHAND, scar: 'cheek', headwear: 'tricorne' })).toEqual([
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

describe('paintScarUnderEyesAndHair', () => {
  const FACE =
    '<svg><g transform="translate(8)"><path/><g transform="translate(76 90)">eyes</g><g transform="translate(-1)">hair</g></g></svg>';

  it('slips the eye scar in just before the eyes and the hair, shifted back into the frame', () => {
    const painted = paintScarUnderEyesAndHair(FACE, 'eye');
    expect(
      painted.startsWith(
        '<svg><g transform="translate(8)"><path/><g transform="translate(-8)"><svg x="140" y="88" width="52" height="52" viewBox="0 0 512 512" opacity=".8"><path fill="#8E2A35" d="M135.688 ',
      ),
    ).toBe(true);
    expect(
      painted.endsWith(
        '"/></svg></g><g transform="translate(76 90)">eyes</g><g transform="translate(-1)">hair</g></g></svg>',
      ),
    ).toBe(true);
  });

  it('slips the cheek scar in before the eyes too', () => {
    expect(paintScarUnderEyesAndHair(FACE, 'cheek')).toBe(
      '<svg><g transform="translate(8)"><path/><g transform="translate(-8)"><g stroke-linecap="round" fill="none"><path d="M164 123l21 16" stroke="#F6C9C4" stroke-opacity=".7" stroke-width="5"/><path d="M164 123l21 16" stroke="#8E2A35" stroke-opacity=".75" stroke-width="2.4"/><path d="M166 129.5l5-6.6M172.5 134.4l5-6.6M179 139.3l5-6.6" stroke="#8E2A35" stroke-opacity=".75" stroke-width="1.8"/></g></g><g transform="translate(76 90)">eyes</g><g transform="translate(-1)">hair</g></g></svg>',
    );
  });

  it('leaves the face untouched without a scar or without an eyes layer to slip under', () => {
    expect(paintScarUnderEyesAndHair(FACE, 'none')).toBe(FACE);
    expect(paintScarUnderEyesAndHair('<svg></svg>', 'eye')).toBe('<svg></svg>');
  });
});
