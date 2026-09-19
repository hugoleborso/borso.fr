import { describe, expect, it } from 'vitest';
import {
  createInstrumentSchema,
  instrumentFamilySchema,
  instrumentIconSchema,
  instrumentIdParamSchema,
  instrumentOrderSchema,
  instrumentPositionSchema,
  updateInstrumentSchema,
} from './instruments.schema';

const MAXIMUM_NAME_LENGTH = 64;
const MAXIMUM_POSITION = 999;

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

describe('instrumentIconSchema', () => {
  it('knows exactly the six glyphs the application ships', () => {
    for (const icon of ['mic-vocal', 'guitar', 'bass', 'piano', 'drum', 'music']) {
      expect(instrumentIconSchema.safeParse(icon).success).toBe(true);
    }
    expect(instrumentIconSchema.safeParse('bouzouki').success).toBe(false);
    expect(instrumentIconSchema.safeParse('micVocal').success).toBe(false);
  });
});

describe('instrumentPositionSchema', () => {
  it('accepts the head of the order and the ceiling', () => {
    expect(instrumentPositionSchema.safeParse(0).success).toBe(true);
    expect(instrumentPositionSchema.safeParse(MAXIMUM_POSITION).success).toBe(true);
  });

  it('refuses a negative, a fraction and anything past the ceiling', () => {
    expect(instrumentPositionSchema.safeParse(-1).success).toBe(false);
    expect(instrumentPositionSchema.safeParse(1.5).success).toBe(false);
    expect(instrumentPositionSchema.safeParse(MAXIMUM_POSITION + 1).success).toBe(false);
  });
});

describe('the icon and position on a create and an update', () => {
  it('accepts a create carrying both, and one carrying neither', () => {
    const base = { name: 'Rhodes', family: 'harmonic' };
    expect(createInstrumentSchema.safeParse({ ...base, icon: 'piano', position: 3 }).success).toBe(
      true,
    );
    expect(createInstrumentSchema.safeParse(base).success).toBe(true);
  });

  it('refuses a create or an update naming a glyph nobody ships', () => {
    expect(
      createInstrumentSchema.safeParse({ name: 'Rhodes', family: 'harmonic', icon: 'bouzouki' })
        .success,
    ).toBe(false);
    expect(updateInstrumentSchema.safeParse({ icon: 'bouzouki' }).success).toBe(false);
  });

  it('accepts an update moving the position alone', () => {
    expect(updateInstrumentSchema.safeParse({ position: 2 }).success).toBe(true);
    expect(updateInstrumentSchema.safeParse({ position: -2 }).success).toBe(false);
  });
});

describe('instrumentOrderSchema', () => {
  it('accepts a list of uuids, including an empty one', () => {
    expect(instrumentOrderSchema.safeParse({ instrumentIds: [] }).success).toBe(true);
    expect(instrumentOrderSchema.safeParse({ instrumentIds: [crypto.randomUUID()] }).success).toBe(
      true,
    );
  });

  it('refuses an entry that is not a uuid, and a missing list', () => {
    expect(instrumentOrderSchema.safeParse({ instrumentIds: ['guitar'] }).success).toBe(false);
    expect(instrumentOrderSchema.safeParse({}).success).toBe(false);
  });
});

describe('instrumentIdParamSchema', () => {
  it('accepts a uuid and refuses anything else', () => {
    expect(instrumentIdParamSchema.safeParse({ id: crypto.randomUUID() }).success).toBe(true);
    expect(instrumentIdParamSchema.safeParse({ id: 'instrument-1' }).success).toBe(false);
  });
});
