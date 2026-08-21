import { describe, expect, it } from 'vitest';
import {
  songDefaultsFormSchema,
  songDefaultsFromFormValues,
  songDefaultsToFormValues,
} from './song-defaults.core';

// @FollowsBlueprint test-pure-unit
describe('songDefaultsToFormValues', () => {
  it('reads every stored default into the text the fields show', () => {
    expect(
      songDefaultsToFormValues({
        status: 'rehearsed',
        tonalityStart: 'Am',
        tonalityEnd: 'C',
        baseEnergy: 7,
      }),
    ).toEqual({ status: 'rehearsed', tonalityStart: 'Am', tonalityEnd: 'C', baseEnergy: '7' });
  });

  it('shows an empty field for every default the song does not carry', () => {
    expect(
      songDefaultsToFormValues({
        status: 'idea',
        tonalityStart: null,
        tonalityEnd: null,
        baseEnergy: null,
      }),
    ).toEqual({ status: 'idea', tonalityStart: '', tonalityEnd: '', baseEnergy: '' });
  });
});

describe('songDefaultsFromFormValues', () => {
  it('trims each tonality and keeps the energy the field holds', () => {
    expect(
      songDefaultsFromFormValues({
        status: 'concert_ready',
        tonalityStart: '  Am  ',
        tonalityEnd: ' C ',
        baseEnergy: '8',
      }),
    ).toEqual({
      status: 'concert_ready',
      tonalityStart: 'Am',
      tonalityEnd: 'C',
      baseEnergy: 8,
    });
  });

  it('reads a blank field as no default at all', () => {
    expect(
      songDefaultsFromFormValues({
        status: 'wip',
        tonalityStart: '   ',
        tonalityEnd: '',
        baseEnergy: '  ',
      }),
    ).toEqual({ status: 'wip', tonalityStart: null, tonalityEnd: null, baseEnergy: null });
  });

  it('drops an energy outside the scale rather than storing it', () => {
    expect(
      songDefaultsFromFormValues({
        status: 'wip',
        tonalityStart: '',
        tonalityEnd: '',
        baseEnergy: '0',
      }).baseEnergy,
    ).toBeNull();
    expect(
      songDefaultsFromFormValues({
        status: 'wip',
        tonalityStart: '',
        tonalityEnd: '',
        baseEnergy: '11',
      }).baseEnergy,
    ).toBeNull();
  });

  it('drops an energy that is not a whole step of the scale', () => {
    expect(
      songDefaultsFromFormValues({
        status: 'wip',
        tonalityStart: '',
        tonalityEnd: '',
        baseEnergy: '4.5',
      }).baseEnergy,
    ).toBeNull();
  });

  it('keeps both ends of the scale', () => {
    const lowest = songDefaultsFromFormValues({
      status: 'wip',
      tonalityStart: '',
      tonalityEnd: '',
      baseEnergy: '1',
    });
    const highest = songDefaultsFromFormValues({
      status: 'wip',
      tonalityStart: '',
      tonalityEnd: '',
      baseEnergy: '10',
    });
    expect([lowest.baseEnergy, highest.baseEnergy]).toEqual([1, 10]);
  });
});

describe('songDefaultsFormSchema', () => {
  it('accepts the values a filled form holds', () => {
    expect(
      songDefaultsFormSchema.safeParse({
        status: 'idea',
        tonalityStart: 'G',
        tonalityEnd: '',
        baseEnergy: '5',
      }).success,
    ).toBe(true);
  });

  it('rejects an energy field carrying anything but digits', () => {
    expect(
      songDefaultsFormSchema.safeParse({
        status: 'idea',
        tonalityStart: '',
        tonalityEnd: '',
        baseEnergy: 'loud',
      }).success,
    ).toBe(false);
  });

  it('rejects a status the catalog does not know', () => {
    expect(
      songDefaultsFormSchema.safeParse({
        status: 'shelved',
        tonalityStart: '',
        tonalityEnd: '',
        baseEnergy: '',
      }).success,
    ).toBe(false);
  });

  it('rejects a tonality longer than the column holds', () => {
    expect(
      songDefaultsFormSchema.safeParse({
        status: 'idea',
        tonalityStart: 'A'.repeat(17),
        tonalityEnd: '',
        baseEnergy: '',
      }).success,
    ).toBe(false);
  });
});
