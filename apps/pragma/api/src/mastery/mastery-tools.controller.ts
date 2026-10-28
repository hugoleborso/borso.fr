import {
  masteryDefaultsListToolInputSchema,
  masteryDefaultToolInputSchema,
} from './mastery.schema';
import { defineTool, getMasteryDefaultsForTool, writeMasteryDefault } from './mastery.service';

// @FollowsBlueprint controller-dispatch
export const MASTERY_TOOLS = [
  defineTool({
    name: 'list_mastery_defaults',
    description:
      'List the default mastery scores, 0 to 10, per member and instrument, optionally of one `member`. `get_song_mastery` reads the scores of one song.',
    routes: ['GET /api/mastery/defaults'],
    inputSchema: masteryDefaultsListToolInputSchema,
    run: async ({ member }) => ({
      kind: 'answered',
      body: { defaults: await getMasteryDefaultsForTool(member) },
    }),
  }),
  defineTool({
    name: 'set_mastery_default',
    description:
      'Set the default mastery score, 0 to 10, of a member on an instrument (names or ids); null removes it.',
    routes: ['PUT /api/mastery/defaults', 'DELETE /api/mastery/defaults/:memberId/:instrumentId'],
    inputSchema: masteryDefaultToolInputSchema,
    run: async ({ member, instrument, score }) => {
      const outcome = await writeMasteryDefault({ member, instrument }, score);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { member, instrument, score } };
    },
  }),
];
