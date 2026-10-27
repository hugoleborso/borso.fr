import { z } from 'zod';
import { outreachTemplateSaveSchema } from './outreach.schema';
import { defineTool, getOutreachTemplate, saveOutreachTemplate } from './outreach.service';

// @FollowsBlueprint controller-dispatch
export const OUTREACH_TOOLS = [
  defineTool({
    name: 'get_outreach_template',
    description:
      'Read the message the band sends to bars when asking for a concert; `body` is null until one is saved.',
    route: 'GET /api/outreach/template',
    inputSchema: z.object({}),
    run: async () => ({ kind: 'answered', body: await getOutreachTemplate() }),
  }),
  defineTool({
    name: 'save_outreach_template',
    description: 'Replace the message the band sends to bars with `body`.',
    route: 'PUT /api/outreach/template',
    inputSchema: outreachTemplateSaveSchema,
    run: async ({ body }) => ({ kind: 'answered', body: await saveOutreachTemplate(body) }),
  }),
];
