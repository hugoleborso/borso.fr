/**
 * A member is a first name, an optional colour and an optional avatar key. The
 * colour is the interesting one: it is a hex string the avatar palette reads.
 */

import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  memberInstrumentTable,
  avatarS3KeySchema,
  colorSchema,
  createMemberSchema,
  firstNameSchema,
  memberIdParamSchema,
  memberInstrumentAssignmentSchema,
  updateMemberSchema,
} from './members.schema';

const MAXIMUM_NAME_LENGTH = 64;
const MAXIMUM_KEY_LENGTH = 512;

describe('firstNameSchema', () => {
  it('trims, and refuses a name that is only whitespace', () => {
    expect(firstNameSchema.parse('  Ada  ')).toBe('Ada');
    expect(firstNameSchema.safeParse('   ').success).toBe(false);
  });

  it('refuses a name past the ceiling and accepts one exactly at it', () => {
    expect(firstNameSchema.safeParse('a'.repeat(MAXIMUM_NAME_LENGTH)).success).toBe(true);
    expect(firstNameSchema.safeParse('a'.repeat(MAXIMUM_NAME_LENGTH + 1)).success).toBe(false);
  });
});

describe('colorSchema', () => {
  it('accepts the hex forms a browser accepts', () => {
    for (const color of ['#abc', '#aabbcc', '#aabbccdd', '#ABC']) {
      expect(colorSchema.safeParse(color).success).toBe(true);
    }
  });

  it('refuses a colour that is not hex, with a message naming the shape', () => {
    expect(() => colorSchema.parse('rebeccapurple')).toThrow('hex color');
  });

  it('refuses a missing hash and a length no hex form uses', () => {
    expect(colorSchema.safeParse('aabbcc').success).toBe(false);
    expect(colorSchema.safeParse('#ab').success).toBe(false);
    expect(colorSchema.safeParse('#aabbccddee').success).toBe(false);
  });
});

describe('avatarS3KeySchema', () => {
  it('accepts a key, and null for a member with no avatar', () => {
    expect(avatarS3KeySchema.safeParse('avatars/ada.png').success).toBe(true);
    expect(avatarS3KeySchema.safeParse(null).success).toBe(true);
  });

  it('refuses an empty key and one past the ceiling', () => {
    expect(avatarS3KeySchema.safeParse('').success).toBe(false);
    expect(avatarS3KeySchema.safeParse('a'.repeat(MAXIMUM_KEY_LENGTH + 1)).success).toBe(false);
  });
});

describe('createMemberSchema', () => {
  it('needs only a first name', () => {
    expect(createMemberSchema.safeParse({ firstName: 'Ada' }).success).toBe(true);
    expect(createMemberSchema.safeParse({}).success).toBe(false);
  });

  it('still validates the optional fields when they are given', () => {
    expect(createMemberSchema.safeParse({ firstName: 'Ada', color: 'blue' }).success).toBe(false);
  });
});

describe('updateMemberSchema', () => {
  it('accepts a patch with nothing in it, and one field at a time', () => {
    expect(updateMemberSchema.safeParse({}).success).toBe(true);
    expect(updateMemberSchema.safeParse({ color: '#abc' }).success).toBe(true);
  });
});

describe('memberInstrumentAssignmentSchema', () => {
  it('accepts an empty assignment, which is how a member is cleared', () => {
    expect(memberInstrumentAssignmentSchema.safeParse({ instrumentIds: [] }).success).toBe(true);
  });

  it('refuses an entry that is not a uuid', () => {
    expect(memberInstrumentAssignmentSchema.safeParse({ instrumentIds: ['guitar'] }).success).toBe(
      false,
    );
  });
});

describe('memberIdParamSchema', () => {
  it('accepts a uuid and refuses anything else', () => {
    expect(memberIdParamSchema.safeParse({ id: crypto.randomUUID() }).success).toBe(true);
    expect(memberIdParamSchema.safeParse({ id: '1' }).success).toBe(false);
  });
});

describe('the member-instrument join', () => {
  it('is keyed by the pair, so a member cannot hold one instrument twice', () => {
    const [primary] = getTableConfig(memberInstrumentTable).primaryKeys;
    expect(primary?.columns.map((column) => column.name)).toEqual(['member_id', 'instrument_id']);
  });
});
