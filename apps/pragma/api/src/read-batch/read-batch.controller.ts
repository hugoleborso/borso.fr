import { Hono } from 'hono';
import { readBatchSchema } from './read-batch.schema';
import {
  answerReadBatch,
  parseJsonOrNull,
  READ_BATCH_INVALID,
  reportInvalidReadBatch,
} from './read-batch.service';

export type RunAppRead = (request: Request, environment: unknown) => Response | Promise<Response>;

// @FollowsBlueprint controller-dispatch
export function buildReadBatchRouter(runAppRead: RunAppRead) {
  return new Hono().post('/', async (context) => {
    const readBatch = readBatchSchema.safeParse(parseJsonOrNull(await context.req.text()));
    if (!readBatch.success) {
      reportInvalidReadBatch(context.req.path);
      return context.json({ error: READ_BATCH_INVALID }, 400);
    }
    const answer = await answerReadBatch({
      batch: readBatch.data,
      outerUrl: context.req.url,
      outerHeaders: context.req.raw.headers,
      runRead: (request) => runAppRead(request, context.env),
    });
    return context.json(answer, 200);
  });
}
