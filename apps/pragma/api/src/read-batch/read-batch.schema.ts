import { z } from 'zod';
import { isBatchableRead, MOST_READS_PER_BATCH, type ReadBatch } from '@domain/read-batch.core';
import { PRAGMA_REQUEST_HEADERS } from '@domain/request-headers.core';

const FIRST_READ = 1;

const batchedReadSchema = z.strictObject({
  path: z.string().refine(isBatchableRead),
  headers: z.partialRecord(z.enum(PRAGMA_REQUEST_HEADERS), z.string()),
});

// @FollowsBlueprint schema-input-only
export const readBatchSchema: z.ZodType<ReadBatch> = z.strictObject({
  reads: z.array(batchedReadSchema).min(FIRST_READ).max(MOST_READS_PER_BATCH),
});
