import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  announcementPatchSchema,
  concertRegistrationTable,
  posterUploadSchema,
  registrationCreateSchema,
  registrationPatchSchema,
} from './concert-registrations.schema';
import { MAX_POSTER_BYTES } from './concert-registrations.types';

const SOME_UUID = '11111111-1111-4111-8111-111111111111';
const FIRST_NAME_MAX = 60;
const PUBLIC_MESSAGE_MAX = 1_000;

// @FollowsBlueprint test-pure-unit
describe('the concert registration table', () => {
  it('holds one mailbox once per concert, however its address is spelled', () => {
    const [constraint] = getTableConfig(concertRegistrationTable).uniqueConstraints;
    expect(constraint?.columns.map((column) => column.name)).toEqual([
      'session_id',
      'canonical_email',
    ]);
  });

  it('stores a hash of the edit token, never the token itself', () => {
    const columnNames = Object.values(getTableConfig(concertRegistrationTable).columns).map(
      (column) => column.name,
    );
    expect(columnNames).toContain('edit_token_hash');
    expect(columnNames).not.toContain('edit_token');
  });
});

describe('registrationCreateSchema', () => {
  it('trims the first name and stores the email trimmed and lower case', () => {
    expect(
      registrationCreateSchema.parse({ firstName: '  Lou ', email: '  Lou@Example.COM ' }),
    ).toEqual({ firstName: 'Lou', email: 'lou@example.com' });
  });

  it('refuses a blank first name and one longer than a name', () => {
    expect(registrationCreateSchema.safeParse({ firstName: '  ', email: 'a@b.fr' }).success).toBe(
      false,
    );
    expect(
      registrationCreateSchema.safeParse({
        firstName: 'x'.repeat(FIRST_NAME_MAX + 1),
        email: 'a@b.fr',
      }).success,
    ).toBe(false);
  });

  it('refuses something that is not an email', () => {
    expect(registrationCreateSchema.safeParse({ firstName: 'Lou', email: 'lou' }).success).toBe(
      false,
    );
  });

  it('refuses a field it does not own', () => {
    expect(
      registrationCreateSchema.safeParse({ firstName: 'Lou', email: 'a@b.fr', admin: true })
        .success,
    ).toBe(false);
  });
});

describe('registrationPatchSchema', () => {
  it('takes a member, a cleared member or a picked Deezer track, and nothing typed freely', () => {
    expect(registrationPatchSchema.safeParse({ comingForMemberId: SOME_UUID }).success).toBe(true);
    expect(registrationPatchSchema.safeParse({ comingForMemberId: null }).success).toBe(true);
    expect(registrationPatchSchema.safeParse({ wishedTrackId: '3135556' }).success).toBe(true);
    expect(registrationPatchSchema.safeParse({ wishedSongTitle: 'Riff' }).success).toBe(false);
  });

  it('refuses an answer that names nothing to change', () => {
    expect(registrationPatchSchema.safeParse({}).success).toBe(false);
  });
});

describe('announcementPatchSchema', () => {
  it('takes a message up to a thousand characters and refuses a longer one', () => {
    expect(
      announcementPatchSchema.safeParse({ message: 'x'.repeat(PUBLIC_MESSAGE_MAX) }).success,
    ).toBe(true);
    expect(
      announcementPatchSchema.safeParse({ message: 'x'.repeat(PUBLIC_MESSAGE_MAX + 1) }).success,
    ).toBe(false);
  });
});

describe('posterUploadSchema', () => {
  it('takes a photo up to ten mebibytes and refuses a document or a heavier file', () => {
    expect(
      posterUploadSchema.safeParse({ contentType: 'image/webp', byteSize: MAX_POSTER_BYTES })
        .success,
    ).toBe(true);
    expect(
      posterUploadSchema.safeParse({ contentType: 'application/pdf', byteSize: 1 }).success,
    ).toBe(false);
    expect(
      posterUploadSchema.safeParse({ contentType: 'image/png', byteSize: MAX_POSTER_BYTES + 1 })
        .success,
    ).toBe(false);
  });
});
