import { eq } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { OUTREACH_TEMPLATE_ROW_ID, outreachTemplateTable } from './outreach.schema';

const PROJECTION = { body: outreachTemplateTable.body } as const;

export async function findOutreachTemplateBody(): Promise<string | null> {
  const database = getDatabase();
  const rows = await database
    .select(PROJECTION)
    .from(outreachTemplateTable)
    .where(eq(outreachTemplateTable.id, OUTREACH_TEMPLATE_ROW_ID))
    .limit(1);
  return rows[0]?.body ?? null;
}

export async function upsertOutreachTemplateBody(body: string): Promise<string> {
  const database = getDatabase();
  const [row] = await database
    .insert(outreachTemplateTable)
    .values({ id: OUTREACH_TEMPLATE_ROW_ID, body })
    .onConflictDoUpdate({ target: outreachTemplateTable.id, set: { body } })
    .returning(PROJECTION);
  if (row === undefined) throw new Error('upsert returned no row');
  return row.body;
}
