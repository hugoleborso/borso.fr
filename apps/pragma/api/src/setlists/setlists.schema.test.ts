/**
 * The lineup override is the interesting one: it accepts three stored shapes
 * because a member could hold one instrument before they could hold two, and
 * the transform lifts all three into lists on read.
 */

import { describe, expect, it } from 'vitest';
import {
  lineupOverrideSchema,
  setlistBySessionParamSchema,
  setlistCreateSchema,
  setlistEntryCreateSchema,
  setlistEntryIdParamSchema,
  setlistEntryUpdateSchema,
  setlistIdParamSchema,
  setlistReorderSchema,
} from './setlists.schema';

const ENERGY_FLOOR = 1;
const ENERGY_CEILING = 10;
const CAPO_FLOOR = 0;
const CAPO_CEILING = 11;
const songId = crypto.randomUUID();
const memberId = crypto.randomUUID();
const instrumentId = crypto.randomUUID();

describe('lineupOverrideSchema', () => {
  it('lifts a single instrument id into a list', () => {
    const parseOutcome = lineupOverrideSchema.safeParse({ [memberId]: instrumentId });
    expect(parseOutcome.success && parseOutcome.data[memberId]).toEqual([instrumentId]);
  });

  it('lifts null into an empty list, which is a member sitting out', () => {
    const parseOutcome = lineupOverrideSchema.safeParse({ [memberId]: null });
    expect(parseOutcome.success && parseOutcome.data[memberId]).toEqual([]);
  });

  it('keeps a list as it is', () => {
    const parseOutcome = lineupOverrideSchema.safeParse({ [memberId]: [instrumentId] });
    expect(parseOutcome.success && parseOutcome.data[memberId]).toEqual([instrumentId]);
  });

  it('refuses a value that is none of the three stored shapes', () => {
    expect(lineupOverrideSchema.safeParse({ [memberId]: 3 }).success).toBe(false);
    expect(lineupOverrideSchema.safeParse({ [memberId]: 'guitar' }).success).toBe(false);
  });
});

describe('setlistEntryCreateSchema', () => {
  it('needs only a song, and fills the rest in', () => {
    expect(setlistEntryCreateSchema.parse({ songId })).toMatchObject({
      energy: null,
      lineupOverride: null,
      keyOverride: null,
      capo: null,
      notes: '',
    });
  });

  it('refuses an energy outside the scale', () => {
    for (const energy of [ENERGY_FLOOR - 1, ENERGY_CEILING + 1, 5.5]) {
      expect(setlistEntryCreateSchema.safeParse({ songId, energy }).success).toBe(false);
    }
    expect(setlistEntryCreateSchema.safeParse({ songId, energy: ENERGY_FLOOR }).success).toBe(true);
  });

  it('refuses a capo outside the frets a capo reaches', () => {
    for (const capo of [CAPO_FLOOR - 1, CAPO_CEILING + 1]) {
      expect(setlistEntryCreateSchema.safeParse({ songId, capo }).success).toBe(false);
    }
    expect(setlistEntryCreateSchema.safeParse({ songId, capo: CAPO_CEILING }).success).toBe(true);
  });

  it('refuses a song that is not a uuid', () => {
    expect(setlistEntryCreateSchema.safeParse({ songId: 'song-1' }).success).toBe(false);
  });
});

describe('setlistEntryUpdateSchema', () => {
  it('accepts a patch with nothing in it', () => {
    expect(setlistEntryUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('still applies the create rules to whichever field is present', () => {
    expect(setlistEntryUpdateSchema.safeParse({ energy: 0 }).success).toBe(false);
  });
});

describe('setlistReorderSchema', () => {
  it('needs at least one entry, since reordering nothing is not a reorder', () => {
    expect(setlistReorderSchema.safeParse({ entryIds: [] }).success).toBe(false);
    expect(setlistReorderSchema.safeParse({ entryIds: [crypto.randomUUID()] }).success).toBe(true);
  });

  it('refuses an entry that is not a uuid', () => {
    expect(setlistReorderSchema.safeParse({ entryIds: ['entry-1'] }).success).toBe(false);
  });
});

describe('the identifier schemas', () => {
  it('each accept a uuid and refuse anything else', () => {
    const id = crypto.randomUUID();
    expect(setlistCreateSchema.safeParse({ sessionId: id }).success).toBe(true);
    expect(setlistIdParamSchema.safeParse({ id }).success).toBe(true);
    expect(setlistEntryIdParamSchema.safeParse({ id, entryId: id }).success).toBe(true);
    expect(setlistBySessionParamSchema.safeParse({ sessionId: id }).success).toBe(true);
    expect(setlistIdParamSchema.safeParse({ id: 'setlist-1' }).success).toBe(false);
    expect(setlistEntryIdParamSchema.safeParse({ id }).success).toBe(false);
  });
});
