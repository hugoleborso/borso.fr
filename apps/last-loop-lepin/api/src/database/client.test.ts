/**
 * @vitest-environment node
 *
 * Database client config — verifies the env-based branching of
 * `getDatabase()`. We can't easily exercise the DSQL signer codepath
 * here (it would require a real AWS account); the local DATABASE_URL
 * path is exercised end-to-end by every other back-e2e test and is the
 * one this audit pins.
 */

import { describe, expect, it } from 'vitest';
import { getDatabase, resetDatabaseForTests } from './client';

describe('database/client', () => {
  it('throws a clear error when no connection env is configured', () => {
    const databaseUrl = process.env.DATABASE_URL;
    const dsqlEndpoint = process.env.DSQL_ENDPOINT;
    delete process.env.DATABASE_URL;
    delete process.env.DSQL_ENDPOINT;
    resetDatabaseForTests();
    try {
      expect(() => getDatabase()).toThrow(/Database not configured/);
    } finally {
      if (databaseUrl !== undefined) process.env.DATABASE_URL = databaseUrl;
      if (dsqlEndpoint !== undefined) process.env.DSQL_ENDPOINT = dsqlEndpoint;
      resetDatabaseForTests();
    }
  });

  it('returns a singleton client across calls when DATABASE_URL is set', () => {
    const first = getDatabase();
    const second = getDatabase();
    expect(first).toBe(second);
  });

  it('rebuilds the client after resetDatabaseForTests()', () => {
    const first = getDatabase();
    resetDatabaseForTests();
    const second = getDatabase();
    expect(second).not.toBe(first);
  });
});
