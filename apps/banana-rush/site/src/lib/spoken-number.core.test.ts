import { describe, expect, it } from 'vitest';
import { parseSpokenNumber } from './spoken-number.core';

// @FollowsBlueprint test-pure-unit
describe('parseSpokenNumber, the French numbers that are not a sum of their words', () => {
  it('reads quatre-vingt-dix as ninety, not as thirty four', () => {
    expect(parseSpokenNumber('quatre-vingt-dix')).toBe(90);
  });

  it('reads quatre-vingts as eighty', () => {
    expect(parseSpokenNumber('quatre-vingts')).toBe(80);
  });

  it('reads quatre-vingt-dix-neuf as ninety nine', () => {
    expect(parseSpokenNumber('quatre-vingt-dix-neuf')).toBe(99);
  });

  it('reads soixante-quinze as seventy five', () => {
    expect(parseSpokenNumber('soixante-quinze')).toBe(75);
  });

  it('reads soixante-dix-sept as seventy seven', () => {
    expect(parseSpokenNumber('soixante-dix-sept')).toBe(77);
  });

  it('reads vingt on its own as twenty', () => {
    expect(parseSpokenNumber('vingt')).toBe(20);
  });

  it('reads vingt-et-un as twenty one', () => {
    expect(parseSpokenNumber('vingt-et-un')).toBe(21);
  });

  it('keeps the hundreds apart, so cent quatre-vingt is a hundred and eighty', () => {
    expect(parseSpokenNumber('cent quatre-vingt')).toBe(180);
  });

  it('reads deux cent cinquante as two hundred and fifty', () => {
    expect(parseSpokenNumber('deux cent cinquante')).toBe(250);
  });

  it('reads cent on its own as a hundred', () => {
    expect(parseSpokenNumber('cent')).toBe(100);
  });

  it('reads mille on its own as a thousand, which the game will refuse as too high', () => {
    expect(parseSpokenNumber('mille')).toBe(1000);
  });

  it('reads deux mille as two thousand', () => {
    expect(parseSpokenNumber('deux mille')).toBe(2000);
  });

  it('reads a number written with its accent', () => {
    expect(parseSpokenNumber('zéro')).toBe(0);
  });

  it('reads a number a recogniser returned in capitals', () => {
    expect(parseSpokenNumber('TRENTE')).toBe(30);
  });

  it('adds rather than multiplies when vingt follows anything but quatre', () => {
    expect(parseSpokenNumber('vingt')).toBe(20);
    expect(parseSpokenNumber('cent vingt')).toBe(120);
  });
});

describe('parseSpokenNumber in English', () => {
  it('reads ninety-nine', () => {
    expect(parseSpokenNumber('ninety-nine')).toBe(99);
  });

  it('reads one hundred fifty', () => {
    expect(parseSpokenNumber('one hundred fifty')).toBe(150);
  });

  it('reads twenty on its own', () => {
    expect(parseSpokenNumber('twenty')).toBe(20);
  });

  it('reads seventeen', () => {
    expect(parseSpokenNumber('seventeen')).toBe(17);
  });

  it('reads two thousand', () => {
    expect(parseSpokenNumber('two thousand')).toBe(2000);
  });
});

describe('parseSpokenNumber on what a recogniser actually returns', () => {
  it('takes the digits a recogniser often writes instead of words', () => {
    expect(parseSpokenNumber('30')).toBe(30);
  });

  it('finds the number inside a whole sentence', () => {
    expect(parseSpokenNumber('je mise trente bananes')).toBe(30);
  });

  it('finds the number inside an English sentence', () => {
    expect(parseSpokenNumber('I bid ninety')).toBe(90);
  });

  it('ignores the filler a person says before the number', () => {
    expect(parseSpokenNumber('euh alors quarante-deux')).toBe(42);
  });

  it('reads a number the recogniser hyphenated oddly', () => {
    expect(parseSpokenNumber('quatre vingt dix')).toBe(90);
  });

  it('refuses a sentence holding no number at all', () => {
    expect(parseSpokenNumber('je ne sais pas')).toBeNull();
  });

  it('refuses silence', () => {
    expect(parseSpokenNumber('')).toBeNull();
  });
});
