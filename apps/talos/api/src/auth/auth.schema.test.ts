import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  passkeyIdSchema,
  passkeyTable,
  registrationOptionsSchema,
  webauthnResponseSchema,
} from './auth.schema';

describe('passkeyTable', () => {
  it('stores the public key as raw bytes', () => {
    const publicKey = getTableConfig(passkeyTable).columns.find(
      (column) => column.name === 'public_key',
    );
    expect(publicKey?.getSQLType()).toBe('bytea');
  });
});

describe('registrationOptionsSchema', () => {
  it('accepts a request without a code, for a second passkey', () => {
    expect(registrationOptionsSchema.parse({})).toEqual({});
  });

  it('refuses a code longer than any bootstrap code', () => {
    expect(registrationOptionsSchema.safeParse({ code: 'x'.repeat(201) }).success).toBe(false);
    expect(registrationOptionsSchema.safeParse({ code: 'x'.repeat(200) }).success).toBe(true);
  });
});

describe('webauthnResponseSchema', () => {
  it('passes the browser response through untouched', () => {
    expect(webauthnResponseSchema.parse({ response: { id: 'a' } })).toEqual({
      response: { id: 'a' },
    });
  });
});

describe('passkeyIdSchema', () => {
  it('accepts only the uuid the database gave the passkey', () => {
    const id = '0b6f1c8e-7c1a-4f1e-9a3b-2d4e5f6a7b8c';
    expect(passkeyIdSchema.parse({ id })).toEqual({ id });
    expect(passkeyIdSchema.safeParse({ id: 'credential' }).success).toBe(false);
  });
});
