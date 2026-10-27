import { z } from 'zod';
import { preferencesUpdateSchema } from './notifications.schema';
import { defineTool, getPreferences, updatePreference } from './notifications.service';

// @FollowsBlueprint controller-dispatch
export const NOTIFICATION_TOOLS = [
  defineTool({
    name: 'get_notification_preferences',
    description: 'Read which categories of push notification you receive.',
    route: 'GET /api/notifications/preferences',
    inputSchema: z.object({}),
    run: async (_input, actor) => ({
      kind: 'answered',
      body: { preferences: await getPreferences(actor.memberId) },
    }),
  }),
  defineTool({
    name: 'set_notification_preference',
    description: 'Turn one category of push notification on or off for you.',
    route: 'PUT /api/notifications/preferences',
    inputSchema: preferencesUpdateSchema,
    run: async (input, actor) => ({
      kind: 'answered',
      body: { preferences: await updatePreference(actor.memberId, input) },
    }),
  }),
];
