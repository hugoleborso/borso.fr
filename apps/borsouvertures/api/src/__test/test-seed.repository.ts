import { getDatabase } from '../database/client';
import { appConfigTable, operatorCredentialTable } from '../database/schema';

// @FollowsBlueprint repository-idempotent-upsert
export async function insertSigningKeyUnlessStored(
  signingKey: typeof appConfigTable.$inferInsert,
): Promise<void> {
  await getDatabase()
    .insert(appConfigTable)
    .values(signingKey)
    .onConflictDoNothing({ target: appConfigTable.id });
}

export async function insertOperatorCredentialUnlessStored(
  credential: typeof operatorCredentialTable.$inferInsert,
): Promise<void> {
  await getDatabase()
    .insert(operatorCredentialTable)
    .values(credential)
    .onConflictDoNothing({ target: operatorCredentialTable.id });
}
