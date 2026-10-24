import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { type Database, type DatabaseExecutor, getDatabase } from '../api/src/database/client';

const ALL_TABLES: readonly string[] = [
  'app_config',
  'audience_suggestion',
  'audience_vote',
  'voting_round',
  'member_credential',
  'member_calendar_feed',
  'member_passkey',
  'webauthn_challenge',
  'setlist_vote',
  'improvement_vote',
  'improvement',
  'auth_attempt',
  'outreach_template',
  'bar',
  'take_comment',
  'take',
  'push_subscription',
  'notification_preference',
  'notification_dispatch',
  'vapid_key_pair',
  'task',
  'transition_comment',
  'setlist_entry',
  'session_setlist',
  'setlist_sheet',
  'setlist',
  'session',
  'study',
  'mastery_score_change',
  'mastery_override',
  'mastery_default',
  'song',
  'member_instrument',
  'instrument',
  'member',
];

export function testDatabase(): Database {
  return getDatabase();
}

export async function truncateAllTables(database: Database): Promise<void> {
  await database.execute(
    sql.raw(
      `TRUNCATE ${ALL_TABLES.map((name) => `"${name}"`).join(', ')} RESTART IDENTITY CASCADE`,
    ),
  );
}

const LOCK_WAITER_POLL_MILLISECONDS = 10;
const LOCK_WAITER_DEADLINE_MILLISECONDS = 10_000;
const lockWaiterCountSchema = z.array(z.object({ waiting: z.coerce.number() }));

async function countLockWaiters(database: Database): Promise<number> {
  const rows: unknown = await database.execute(
    sql`SELECT count(*) AS waiting FROM pg_stat_activity
        WHERE datname = current_database() AND wait_event_type = 'Lock'`,
  );
  return lockWaiterCountSchema.parse(rows)[0]?.waiting ?? 0;
}

async function waitForLockWaiters(database: Database, expected: number): Promise<void> {
  const deadline = Date.now() + LOCK_WAITER_DEADLINE_MILLISECONDS;
  while ((await countLockWaiters(database)) < expected) {
    if (Date.now() > deadline) throw new Error(`fewer than ${expected} writers ever waited`);
    await new Promise((resolve) => setTimeout(resolve, LOCK_WAITER_POLL_MILLISECONDS));
  }
}

async function waitUntilSettledOrWaiting(
  database: Database,
  pending: Promise<unknown>,
  expected: number,
): Promise<void> {
  const progress = { isSettled: false };
  const markSettled = (): void => {
    progress.isSettled = true;
  };
  void pending.then(markSettled, markSettled);
  const deadline = Date.now() + LOCK_WAITER_DEADLINE_MILLISECONDS;
  while (!progress.isSettled && (await countLockWaiters(database)) < expected) {
    if (Date.now() > deadline) throw new Error(`neither settled nor among ${expected} waiters`);
    await new Promise((resolve) => setTimeout(resolve, LOCK_WAITER_POLL_MILLISECONDS));
  }
}

export type LockHold = (transaction: DatabaseExecutor) => Promise<unknown>;

export function holdWritesToTable(tableName: string): LockHold {
  return async (transaction) =>
    await transaction.execute(sql.raw(`LOCK TABLE "${tableName}" IN SHARE MODE`));
}

export async function runWithWritesToTableHeld<Result>(
  tableName: string,
  writers: number,
  start: () => Promise<Result>,
): Promise<Result> {
  const database = getDatabase();
  const started = await database.transaction(async (transaction) => {
    await holdWritesToTable(tableName)(transaction);
    const pending = start();
    await waitForLockWaiters(database, writers);
    return { pending };
  });
  return await started.pending;
}

export async function runSecondWhileFirstWaitsOnHold<First, Second>(
  hold: LockHold,
  first: () => Promise<First>,
  second: () => Promise<Second>,
): Promise<readonly [First, Second]> {
  const database = getDatabase();
  const started = await database.transaction(async (transaction) => {
    await hold(transaction);
    const firstPending = first();
    await waitForLockWaiters(database, 1);
    const secondPending = second();
    await waitUntilSettledOrWaiting(database, secondPending, 2);
    return { firstPending, secondPending };
  });
  return [await started.firstPending, await started.secondPending];
}

export async function runWhileWaitingOnHold<Result>(
  hold: LockHold,
  start: () => Promise<Result>,
  whileWaiting: LockHold,
): Promise<Result> {
  const database = getDatabase();
  const started = await database.transaction(async (transaction) => {
    await hold(transaction);
    const pending = start();
    await waitForLockWaiters(database, 1);
    await whileWaiting(transaction);
    return { pending };
  });
  return await started.pending;
}

const SIMULATED_CONFLICT_SEQUENCE = 'simulated_conflict_attempt';
const SIMULATED_CONFLICT_FUNCTION = 'abort_with_simulated_conflict';
const SIMULATED_CONFLICT_TRIGGER = 'simulated_conflict_at_commit';

export type SimulatedConflictRemoval = () => Promise<void>;

export async function abortCommitsWritingTable(
  tableName: string,
  abortedCommits: number,
): Promise<SimulatedConflictRemoval> {
  const database = getDatabase();
  await database.execute(sql.raw(`CREATE SEQUENCE "${SIMULATED_CONFLICT_SEQUENCE}"`));
  await database.execute(
    sql.raw(`CREATE FUNCTION "${SIMULATED_CONFLICT_FUNCTION}"() RETURNS trigger AS $$
      BEGIN
        IF nextval('"${SIMULATED_CONFLICT_SEQUENCE}"') <= ${String(abortedCommits)} THEN
          RAISE EXCEPTION 'simulated commit conflict' USING ERRCODE = 'serialization_failure';
        END IF;
        RETURN NULL;
      END $$ LANGUAGE plpgsql`),
  );
  await database.execute(
    sql.raw(`CREATE CONSTRAINT TRIGGER "${SIMULATED_CONFLICT_TRIGGER}"
      AFTER INSERT OR UPDATE OR DELETE ON "${tableName}"
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
      EXECUTE FUNCTION "${SIMULATED_CONFLICT_FUNCTION}"()`),
  );
  return async () => {
    await database.execute(
      sql.raw(`DROP TRIGGER "${SIMULATED_CONFLICT_TRIGGER}" ON "${tableName}"`),
    );
    await database.execute(sql.raw(`DROP FUNCTION "${SIMULATED_CONFLICT_FUNCTION}"()`));
    await database.execute(sql.raw(`DROP SEQUENCE "${SIMULATED_CONFLICT_SEQUENCE}"`));
  };
}
