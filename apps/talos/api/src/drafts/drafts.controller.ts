import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { draftSlugValidator, draftStatusChangeValidator } from './drafts.schema';
import { changeDraftStatus, listDrafts } from './drafts.service';

// @FollowsBlueprint controller-guarded-router
export function buildDraftsRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/', async (context) => context.json({ items: await listDrafts() }))
    .patch('/:slug', draftSlugValidator, draftStatusChangeValidator, async (context) => {
      const draft = await changeDraftStatus({
        slug: context.req.valid('param').slug,
        target: context.req.valid('json').status,
        now: new Date(),
      });
      return context.json(draft);
    });
}
