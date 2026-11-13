import { type DatabaseExecutor, getDatabase } from '../database/client';
import { appConfigTable, operatorCredentialTable } from '../database/schema';

// @FollowsBlueprint repository-owned-transaction
export async function runInOneSeedTransaction<Result>(
  work: (executor: DatabaseExecutor) => Promise<Result>,
): Promise<Result> {
  return await getDatabase().transaction(work);
}

// @FollowsBlueprint repository-idempotent-upsert
export async function insertSigningKeyUnlessStored(
  signingKey: typeof appConfigTable.$inferInsert,
  executor: DatabaseExecutor = getDatabase(),
): Promise<void> {
  await executor
    .insert(appConfigTable)
    .values(signingKey)
    .onConflictDoNothing({ target: appConfigTable.id });
}

export async function insertOperatorCredentialUnlessStored(
  credential: typeof operatorCredentialTable.$inferInsert,
  executor: DatabaseExecutor = getDatabase(),
): Promise<void> {
  await executor
    .insert(operatorCredentialTable)
    .values(credential)
    .onConflictDoNothing({ target: operatorCredentialTable.id });
}
