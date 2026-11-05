import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { readBatchSchema } from './read-batch.schema';
import { answerReadBatch, READ_BATCH_INVALID, reportInvalidReadBatch } from './read-batch.service';

export type RunAppRead = (request: Request, environment: unknown) => Response | Promise<Response>;

// @FollowsBlueprint controller-dispatch
export function buildReadBatchRouter(runAppRead: RunAppRead) {
  return new Hono().post(
    '/',
    zValidator('json', readBatchSchema, (result, context) => {
      if (result.success) return undefined;
      reportInvalidReadBatch(context.req.path);
      return context.json({ error: READ_BATCH_INVALID }, 400);
    }),
    async (context) => {
      const batch = context.req.valid('json');
      const answer = await answerReadBatch({
        batch,
        outerUrl: context.req.url,
        outerHeaders: context.req.raw.headers,
        runRead: (request) => runAppRead(request, context.env),
      });
      return context.json(answer, 200);
    },
  );
}
