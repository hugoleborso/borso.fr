import { Hono } from 'hono';
import {
  answerFixtureFeedRequest,
  probeProductionBoundary,
  seedPreviewFixture,
} from './test-seed.service';

const PLAIN_TEXT_CONTENT_TYPE = 'text/plain; charset=utf-8';

function waitFor(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

// @FollowsBlueprint controller-dispatch
export function buildTestSeedRouter() {
  return new Hono()
    .post('/seed', async (context) => {
      const summary = await seedPreviewFixture(new Date(), new URL(context.req.url).origin);
      return context.json(summary);
    })
    .get('/production-boundary', async (context) => {
      return context.json({ productionBoundary: await probeProductionBoundary() });
    })
    .get('/calendar-feeds/:fileName', async (context) => {
      const answer = answerFixtureFeedRequest(context.req.param('fileName'), new Date());
      await waitFor(answer.delayMs);
      return new Response(answer.body, {
        status: answer.status,
        headers: { 'content-type': PLAIN_TEXT_CONTENT_TYPE },
      });
    });
}
