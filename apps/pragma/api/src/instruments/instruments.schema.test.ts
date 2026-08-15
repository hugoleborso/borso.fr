/**
 * Every rule here is one a caller could break: a blank name, a family outside
 * the four the domain knows, an id that is not a uuid.
 */

import { describe, expect, it } from 'vitest';
import {
  createInstrumentSchema,
  instrumentFamilySchema,
  instrumentIdParamSchema,
  updateInstrumentSchema,
} from './instruments.schema';

const MAXIMUM_NAME_LENGTH = 64;

describe('createInstrumentSchema', () => {
  it('accepts a named instrument in a known family', () => {
    expect(createInstrumentSchema.safeParse({ name: 'Rhodes', family: 'harmonic' }).success).toBe(
      true,
    );
  });

  it('trims the name, so whitespace alone is not a name', () => {
    expect(createInstrumentSchema.parse({ name: '  Rhodes  ', family: 'harmonic' }).name).toBe(
      'Rhodes',
    );
    expect(createInstrumentSchema.safeParse({ name: '   ', family: 'harmonic' }).success).toBe(
      false,
    );
  });

  it('refuses a name past the ceiling and accepts one exactly at it', () => {
    const family = 'percussive';
    expect(
      createInstrumentSchema.safeParse({ name: 'a'.repeat(MAXIMUM_NAME_LENGTH), family }).success,
    ).toBe(true);
    expect(
      createInstrumentSchema.safeParse({ name: 'a'.repeat(MAXIMUM_NAME_LENGTH + 1), family })
        .success,
    ).toBe(false);
  });

  it('refuses a family the domain does not define', () => {
    expect(createInstrumentSchema.safeParse({ name: 'Rhodes', family: 'string' }).success).toBe(
      false,
    );
  });

  it('refuses a create with either half missing', () => {
    expect(createInstrumentSchema.safeParse({ name: 'Rhodes' }).success).toBe(false);
    expect(createInstrumentSchema.safeParse({ family: 'vocal' }).success).toBe(false);
  });
});

describe('updateInstrumentSchema', () => {
  it('accepts either field alone, since an update is a patch', () => {
    expect(updateInstrumentSchema.safeParse({ name: 'Wurlitzer' }).success).toBe(true);
    expect(updateInstrumentSchema.safeParse({ family: 'other' }).success).toBe(true);
    expect(updateInstrumentSchema.safeParse({}).success).toBe(true);
  });

  it('still applies the same rules to whichever field is present', () => {
    expect(updateInstrumentSchema.safeParse({ name: '  ' }).success).toBe(false);
    expect(updateInstrumentSchema.safeParse({ family: 'string' }).success).toBe(false);
  });
});

describe('instrumentFamilySchema', () => {
  it('knows exactly the four families the domain declares', () => {
    for (const family of ['harmonic', 'percussive', 'vocal', 'other']) {
      expect(instrumentFamilySchema.safeParse(family).success).toBe(true);
    }
    expect(instrumentFamilySchema.safeParse('brass').success).toBe(false);
  });
});

describe('instrumentIdParamSchema', () => {
  it('accepts a uuid and refuses anything else', () => {
    expect(instrumentIdParamSchema.safeParse({ id: crypto.randomUUID() }).success).toBe(true);
    expect(instrumentIdParamSchema.safeParse({ id: 'instrument-1' }).success).toBe(false);
  });
});
