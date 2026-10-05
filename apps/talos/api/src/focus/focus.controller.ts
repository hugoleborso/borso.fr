import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { focusUpdateValidator } from './focus.schema';
import { readFocus, replaceFocus } from './focus.service';

// @FollowsBlueprint controller-guarded-router
export function buildFocusRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/', async (context) => context.json(await readFocus()))
    .put('/', focusUpdateValidator, async (context) =>
      context.json(await replaceFocus(context.req.valid('json').items, new Date())),
    );
}
