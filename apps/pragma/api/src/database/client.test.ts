import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDatabase } from './client';

const CREATE_PROBE = sql.raw(`
  CREATE OR REPLACE FUNCTION schema_changed_once() RETURNS integer AS $$
  BEGIN
    IF nextval('schema_change_probe') = 1 THEN
      RAISE EXCEPTION 'schema has been updated by another transaction (OC001)' USING ERRCODE = '40001';
    END IF;
    RETURN 1;
  END
  $$ LANGUAGE plpgsql
`);

// @FollowsBlueprint test-back-e2e
describe('a statement that loses to a deploy migration (back-e2e)', () => {
  beforeAll(async () => {
    await getDatabase().execute(sql.raw('CREATE SEQUENCE IF NOT EXISTS schema_change_probe'));
    await getDatabase().execute(CREATE_PROBE);
  });

  afterAll(async () => {
    await getDatabase().execute(sql.raw('DROP FUNCTION IF EXISTS schema_changed_once()'));
    await getDatabase().execute(sql.raw('DROP SEQUENCE IF EXISTS schema_change_probe'));
  });

  it('answers on its second run instead of failing the request', async () => {
    const rows = await getDatabase().execute(sql.raw('SELECT schema_changed_once() AS answer'));
    expect(rows[0]).toEqual({ answer: 1 });
  });

  it('runs a transaction that lost to a deploy migration again, whole', async () => {
    await getDatabase().execute(sql.raw("SELECT setval('schema_change_probe', 1, false)"));
    let runs = 0;
    const answer = await getDatabase().transaction(async (transaction) => {
      runs += 1;
      const rows = await transaction.execute(sql.raw('SELECT schema_changed_once() AS answer'));
      return rows[0];
    });
    expect(answer).toEqual({ answer: 1 });
    expect(runs).toBe(2);
  });
});
