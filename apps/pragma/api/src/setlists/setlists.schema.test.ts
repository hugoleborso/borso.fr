import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  lineupOverrideSchema,
  setlistBySessionParamSchema,
  setlistCreateSchema,
  setlistEntryCreateSchema,
  setlistEntryIdParamSchema,
  setlistEntryUpdateSchema,
  setlistIdParamSchema,
  setlistLinkSchema,
  setlistRenameSchema,
  setlistReorderSchema,
  setlistSessionParamSchema,
  sessionSetlistTable,
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

describe('setlistCreateSchema', () => {
  it('takes a setlist belonging to no session yet, with no name', () => {
    expect(setlistCreateSchema.parse({})).toEqual({ name: '', sessionId: null });
  });

  it('attaches the setlist to the session the caller named', () => {
    const sessionId = crypto.randomUUID();
    expect(setlistCreateSchema.parse({ name: '  Rappel  ', sessionId })).toEqual({
      name: 'Rappel',
      sessionId,
    });
  });

  it('refuses a session that is not a uuid', () => {
    expect(setlistCreateSchema.safeParse({ sessionId: 'session-1' }).success).toBe(false);
  });
});

describe('setlistRenameSchema', () => {
  it('trims the new name', () => {
    expect(setlistRenameSchema.parse({ name: ' Filage ' })).toEqual({ name: 'Filage' });
  });

  it('refuses a missing name, which would erase the current one by accident', () => {
    expect(setlistRenameSchema.safeParse({}).success).toBe(false);
  });
});

describe('the identifier schemas', () => {
  it('each accept a uuid and refuse anything else', () => {
    const id = crypto.randomUUID();
    expect(setlistIdParamSchema.safeParse({ id }).success).toBe(true);
    expect(setlistEntryIdParamSchema.safeParse({ id, entryId: id }).success).toBe(true);
    expect(setlistBySessionParamSchema.safeParse({ sessionId: id }).success).toBe(true);
    expect(setlistSessionParamSchema.safeParse({ id, sessionId: id }).success).toBe(true);
    expect(setlistLinkSchema.safeParse({ sessionId: id }).success).toBe(true);
    expect(setlistIdParamSchema.safeParse({ id: 'setlist-1' }).success).toBe(false);
    expect(setlistEntryIdParamSchema.safeParse({ id }).success).toBe(false);
    expect(setlistLinkSchema.safeParse({ sessionId: 'session-1' }).success).toBe(false);
  });
});

describe('the session-setlist link table', () => {
  it('identifies a link by the session and the setlist, so one pair is stored once', () => {
    const [primary] = getTableConfig(sessionSetlistTable).primaryKeys;
    expect(primary?.columns.map((column) => column.name)).toEqual(['session_id', 'setlist_id']);
  });
});
