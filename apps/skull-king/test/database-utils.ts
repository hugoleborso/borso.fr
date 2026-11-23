import postgres, { type TransactionSql } from 'postgres';
import { z } from 'zod';

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

const LOCK_WAITER_POLL_MILLISECONDS = 10;
const LOCK_WAITER_DEADLINE_MILLISECONDS = 10_000;
const lockWaiterCountSchema = z.array(z.object({ waiting: z.coerce.number() }));

async function countLockWaiters(): Promise<number> {
  const rows: unknown = await testSql().unsafe(
    `SELECT count(*) AS waiting FROM pg_stat_activity
     WHERE datname = current_database() AND wait_event_type = 'Lock'`,
  );
  return lockWaiterCountSchema.parse(rows)[0]?.waiting ?? 0;
}

async function waitForLockWaiters(expected: number, heldOn: string): Promise<void> {
  const deadline = Date.now() + LOCK_WAITER_DEADLINE_MILLISECONDS;
  while ((await countLockWaiters()) < expected) {
    if (Date.now() > deadline) {
      throw new Error(
        `fewer than ${expected} writers ever waited on ${heldOn}: check that the write under test touches it`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, LOCK_WAITER_POLL_MILLISECONDS));
  }
}

export interface LockHold {
  readonly heldOn: string;
  readonly take: (transaction: TransactionSql) => Promise<unknown>;
}

export function holdGameRow(joinCode: string): LockHold {
  return {
    heldOn: `the game row of ${joinCode}`,
    take: async (transaction) =>
      await transaction`SELECT 1 FROM game WHERE join_code = ${joinCode} FOR UPDATE`,
  };
}

export function holdWritesToTable(tableName: string): LockHold {
  return {
    heldOn: `table "${tableName}"`,
    take: async (transaction) =>
      await transaction.unsafe(`LOCK TABLE "${tableName}" IN SHARE MODE`),
  };
}

// @FollowsBlueprint test-database-isolation
export async function runWritersWhileHeld<First, Second>(
  hold: LockHold,
  first: () => Promise<First>,
  second: () => Promise<Second>,
): Promise<readonly [First, Second]> {
  const started = await testSql().begin(async (transaction) => {
    await hold.take(transaction);
    const firstPending = first();
    await waitForLockWaiters(1, hold.heldOn);
    const secondPending = second();
    await waitForLockWaiters(2, hold.heldOn);
    return { firstPending, secondPending };
  });
  return [await started.firstPending, await started.secondPending];
}

export async function countRows(query: string, parameters: readonly string[]): Promise<number> {
  const rows: unknown = await testSql().unsafe(query, [...parameters]);
  return z.array(z.object({ count: z.coerce.number() })).parse(rows)[0]?.count ?? 0;
}
