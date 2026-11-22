import postgres from 'postgres';

const TRUNCATED_TABLES = [
  'round_entry',
  'round',
  'socket_connection',
  'account_game',
  'player',
  'join_code_claim',
  'game',
  'passkey',
  'webauthn_challenge',
  'account',
  'app_secret',
];

let cachedSql: ReturnType<typeof postgres> | null = null;

function testSql(): ReturnType<typeof postgres> {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_URL is not set in the back-e2e suite');
  cachedSql ??= postgres(url, { onnotice: () => undefined });
  return cachedSql;
}

// @FollowsBlueprint test-database-isolation
export async function truncateAllTables(): Promise<void> {
  await testSql().unsafe(`TRUNCATE ${TRUNCATED_TABLES.join(', ')} CASCADE`);
}

const SIMULATED_CONFLICT_SEQUENCE = 'simulated_conflict_count';
const SIMULATED_CONFLICT_FUNCTION = 'simulated_conflict_abort';
const SIMULATED_CONFLICT_TRIGGER = 'simulated_conflict_trigger';

export interface SimulatedConflict {
  readonly countCommitsSeen: () => Promise<number>;
  readonly remove: () => Promise<void>;
}

// @FollowsBlueprint test-database-isolation
export async function abortCommitsUpdatingColumn(
  tableName: string,
  columnName: string,
  abortedCommits: number,
): Promise<SimulatedConflict> {
  const sql = testSql();
  await sql.unsafe(`DROP SEQUENCE IF EXISTS "${SIMULATED_CONFLICT_SEQUENCE}"`);
  await sql.unsafe(`CREATE SEQUENCE "${SIMULATED_CONFLICT_SEQUENCE}"`);
  await sql.unsafe(`CREATE OR REPLACE FUNCTION "${SIMULATED_CONFLICT_FUNCTION}"() RETURNS trigger AS $$
    BEGIN
      IF nextval('"${SIMULATED_CONFLICT_SEQUENCE}"') <= ${String(abortedCommits)} THEN
        RAISE EXCEPTION 'simulated commit conflict' USING ERRCODE = 'serialization_failure';
      END IF;
      RETURN NULL;
    END $$ LANGUAGE plpgsql`);
  await sql.unsafe(`CREATE CONSTRAINT TRIGGER "${SIMULATED_CONFLICT_TRIGGER}"
    AFTER UPDATE OF "${columnName}" ON "${tableName}"
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
    EXECUTE FUNCTION "${SIMULATED_CONFLICT_FUNCTION}"()`);
  return {
    countCommitsSeen: async () => {
      const rows = await sql.unsafe<{ seen: number }[]>(
        `SELECT CASE WHEN is_called THEN last_value ELSE 0 END::int AS seen FROM "${SIMULATED_CONFLICT_SEQUENCE}"`,
      );
      return rows[0]?.seen ?? 0;
    },
    remove: async () => {
      await sql.unsafe(`DROP TRIGGER "${SIMULATED_CONFLICT_TRIGGER}" ON "${tableName}"`);
      await sql.unsafe(`DROP FUNCTION "${SIMULATED_CONFLICT_FUNCTION}"()`);
      await sql.unsafe(`DROP SEQUENCE "${SIMULATED_CONFLICT_SEQUENCE}"`);
    },
  };
}
