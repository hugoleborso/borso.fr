import { sql } from 'drizzle-orm';
import { type Database, getDatabase } from '../api/src/database/client';

const ALL_TABLES: readonly string[] = [
  'app_config',
  'audience_suggestion',
  'audience_vote',
  'voting_round',
  'member_credential',
  'member_passkey',
  'webauthn_challenge',
  'setlist_vote',
  'improvement_vote',
  'improvement',
  'auth_attempt',
  'outreach_template',
  'bar',
  'task',
  'transition_comment',
  'setlist_entry',
  'session_setlist',
  'setlist_sheet',
  'setlist',
  'session',
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
