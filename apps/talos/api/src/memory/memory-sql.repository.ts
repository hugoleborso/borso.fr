import { z } from 'zod';
import { getDatabase } from '../database/client';

const valuesRowSchema = z.array(z.unknown());

export interface ReadOnlyQueryAnswer {
  readonly columns: string[];
  readonly rows: unknown[][];
}

// @FollowsBlueprint repository-query
export async function runReadOnlyQuery(
  boundedQuery: string,
  timeoutMilliseconds: number,
): Promise<ReadOnlyQueryAnswer> {
  return await getDatabase().$client.begin('read only', async (transaction) => {
    const pending = transaction.unsafe(boundedQuery).values();
    const timer = setTimeout(() => {
      pending.cancel();
    }, timeoutMilliseconds);
    try {
      const rows = await pending;
      return {
        columns: rows.columns.map((column) => column.name),
        rows: rows.map((row: unknown) => valuesRowSchema.parse(row)),
      };
    } finally {
      clearTimeout(timer);
    }
  });
}
