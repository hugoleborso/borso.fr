import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  appSecretTable,
  passkeyTable,
  registrationOptionsSchema,
  registrationSchema,
  signInSchema,
} from './accounts.schema';

// @FollowsBlueprint test-pure-unit
describe('the account tables', () => {
  it('keys a passkey on its credential, so one credential belongs to one account', () => {
    const primary = getTableConfig(passkeyTable).columns.filter((column) => column.primary);
    expect(primary.map((column) => column.name)).toEqual(['credential_id']);
  });

  it('stores the session key as bytes', () => {
    const key = getTableConfig(appSecretTable).columns.find((column) => column.name === 'hmac_key');
    expect(key?.getSQLType()).toBe('bytea');
  });
});

describe('the account inputs', () => {
  it('trims the name asked for the passkey', () => {
    expect(registrationOptionsSchema.parse({ name: ' Hugo ' })).toEqual({ name: 'Hugo' });
  });

  it('takes a name and a mark with the browser response', () => {
    const response = { id: 'credential-1' };
    expect(
      registrationSchema.parse({ name: 'Hugo', icon: 'skull', color: 'gold', response }),
    ).toEqual({ name: 'Hugo', icon: 'skull', color: 'gold', response });
    expect(
      registrationSchema.safeParse({ name: 'Hugo', icon: 'cat', color: 'gold', response }).success,
    ).toBe(false);
  });

  it('takes only the browser response to sign in', () => {
    expect(signInSchema.safeParse({ response: {}, name: 'Hugo' }).success).toBe(false);
  });
});
