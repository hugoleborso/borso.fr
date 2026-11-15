import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireMemberSession } from '../auth/member-session.middleware';
import { bandLinkCreateSchema, bandLinkPathSchema } from './band-links.schema';
import { addBandLink, didRemoveBandLink, listBandLinks } from './band-links.service';

const CREATED_STATUS = 201;
const NOT_FOUND_STATUS = 404;
const NOT_FOUND_ERROR = 'band-link-not-found';

function readNow(): Date {
  return new Date();
}

// @FollowsBlueprint controller-dispatch
export function buildBandLinksRouter() {
  return new Hono()
    .use('*', requireMemberSession)
    .get('/', async (context) => {
      const bandLinks = await listBandLinks();
      return context.json({ bandLinks });
    })
    .post('/', zValidator('json', bandLinkCreateSchema), async (context) => {
      const bandLink = await addBandLink(context.req.valid('json'), readNow());
      return context.json({ bandLink }, CREATED_STATUS);
    })
    .delete('/:id', zValidator('param', bandLinkPathSchema), async (context) => {
      const { id } = context.req.valid('param');
      const isDeleted = await didRemoveBandLink(id);
      if (!isDeleted) return context.json({ error: NOT_FOUND_ERROR }, NOT_FOUND_STATUS);
      return context.json({ id, deleted: true });
    });
}
