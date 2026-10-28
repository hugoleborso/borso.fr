import { z } from 'zod';
import { outreachTemplateSaveSchema } from './outreach.schema';
import { defineTool, getOutreachTemplate, saveOutreachTemplate } from './outreach.service';

// @FollowsBlueprint controller-dispatch
export const OUTREACH_TOOLS = [
  defineTool({
    name: 'get_outreach_template',
    description:
      'Read the message the band sends to bars when asking for a concert; `body` is absent until one is saved.',
    routes: ['GET /api/outreach/template'],
    inputSchema: z.object({}),
    run: async () => ({ kind: 'answered', body: await getOutreachTemplate() }),
  }),
  defineTool({
    name: 'save_outreach_template',
    description: 'Replace the message the band sends to bars with `body`.',
    routes: ['PUT /api/outreach/template'],
    inputSchema: outreachTemplateSaveSchema,
    run: async ({ body }) => {
      await saveOutreachTemplate(body);
      return { kind: 'answered', body: { saved: true } };
    },
  }),
];
