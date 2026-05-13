import { describe, expect, it } from 'vitest';
import { type ArchChoice, needsAdr, triggersFor } from './adr-trigger.utils';

const ALL_FALSE: ArchChoice = {
  hasMultipleSeriousAlternatives: false,
  hasCrossCuttingImpact: false,
  divergesFromConvention: false,
  looksStandardOrExistsElsewhere: false,
};

describe('needsAdr', () => {
  it('returns false when all four flags are false', () => {
    expect(needsAdr(ALL_FALSE)).toBe(false);
  });

  it('returns true as soon as any single flag is true', () => {
    expect(needsAdr({ ...ALL_FALSE, hasMultipleSeriousAlternatives: true })).toBe(true);
    expect(needsAdr({ ...ALL_FALSE, hasCrossCuttingImpact: true })).toBe(true);
    expect(needsAdr({ ...ALL_FALSE, divergesFromConvention: true })).toBe(true);
    expect(needsAdr({ ...ALL_FALSE, looksStandardOrExistsElsewhere: true })).toBe(true);
  });

  it('returns true when all four flags are true', () => {
    expect(
      needsAdr({
        hasMultipleSeriousAlternatives: true,
        hasCrossCuttingImpact: true,
        divergesFromConvention: true,
        looksStandardOrExistsElsewhere: true,
      }),
    ).toBe(true);
  });
});

describe('triggersFor', () => {
  it('returns an empty array when no flag is set', () => {
    expect(triggersFor(ALL_FALSE)).toEqual([]);
  });

  it('names each flag that is set, in declaration order', () => {
    expect(
      triggersFor({
        hasMultipleSeriousAlternatives: true,
        hasCrossCuttingImpact: false,
        divergesFromConvention: true,
        looksStandardOrExistsElsewhere: false,
      }),
    ).toEqual(['multiple-alternatives', 'diverges-from-convention']);
  });

  it('emits all four trigger names when every flag is true', () => {
    expect(
      triggersFor({
        hasMultipleSeriousAlternatives: true,
        hasCrossCuttingImpact: true,
        divergesFromConvention: true,
        looksStandardOrExistsElsewhere: true,
      }),
    ).toEqual([
      'multiple-alternatives',
      'cross-cutting',
      'diverges-from-convention',
      'looks-standard',
    ]);
  });
});
