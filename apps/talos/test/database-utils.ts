import { sql } from 'drizzle-orm';
import { getDatabase } from '../api/src/database/client';

const ALL_TABLES = [
  'auth_attempt',
  'memory_alias',
  'memory_change_batch',
  'memory_citation',
  'memory_commitment',
  'memory_document',
  'memory_draft',
  'memory_entity',
  'memory_event',
  'memory_fact',
  'memory_focus_item',
  'memory_journal_entry',
  'memory_proposal',
  'memory_relation',
  'memory_source',
  'memory_state',
  'memory_todo',
  'memory_verb',
  'passkey',
  'push_subscription',
  'session',
  'webauthn_challenge',
];

// @FollowsBlueprint test-database-isolation
export async function truncateAllTables(): Promise<void> {
  await getDatabase().execute(
    sql.raw(`TRUNCATE ${ALL_TABLES.map((name) => `"${name}"`).join(', ')} CASCADE`),
  );
}
