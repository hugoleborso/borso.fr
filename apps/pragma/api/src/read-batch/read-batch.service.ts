import type { ReadBatch, ReadBatchAnswer } from '@domain/read-batch.core';
import {
  recordReadBatchSize,
  reportTaggedFailure,
} from '../helpers/observability/error-reporting.adapter';
import { buildItemRequest, toBatchedAnswer } from './read-batch.core';

export { parseJsonOrNull } from '../helpers/json/json.core';

const CONTENT_TYPE_HEADER = 'content-type';

export const READ_BATCH_INVALID = 'read-batch-invalid';

export type RunRead = (request: Request) => Response | Promise<Response>;

export interface AnswerReadBatchParams {
  readonly batch: ReadBatch;
  readonly outerUrl: string;
  readonly outerHeaders: Headers;
  readonly runRead: RunRead;
}

// @FollowsBlueprint service-clock-injected
export async function answerReadBatch(params: AnswerReadBatchParams): Promise<ReadBatchAnswer> {
  recordReadBatchSize(params.batch.reads.length);
  const answers = await Promise.all(
    params.batch.reads.map(async (read) => {
      const response = await params.runRead(
        buildItemRequest(read, params.outerUrl, params.outerHeaders),
      );
      return toBatchedAnswer(
        response.status,
        response.headers.get(CONTENT_TYPE_HEADER),
        await response.text(),
      );
    }),
  );
  return { answers };
}

export function reportInvalidReadBatch(route: string): void {
  reportTaggedFailure({ name: READ_BATCH_INVALID, tags: { route } });
}
