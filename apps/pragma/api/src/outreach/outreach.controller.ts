import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireMemberSession } from '../auth/member-session.middleware';
import { outreachTemplateSaveSchema } from './outreach.schema';
import { getOutreachTemplate, saveOutreachTemplate } from './outreach.service';

// @FollowsBlueprint controller-dispatch
export function buildOutreachRouter() {
  return new Hono()
    .use('*', requireMemberSession)
    .get('/template', async (context) => {
      return context.json(await getOutreachTemplate());
    })
    .put('/template', zValidator('json', outreachTemplateSaveSchema), async (context) => {
      const { body } = context.req.valid('json');
      return context.json(await saveOutreachTemplate(body));
    });
}
