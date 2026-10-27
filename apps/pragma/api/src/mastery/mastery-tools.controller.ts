import { z } from 'zod';
import {
  masteryDefaultPathSchema,
  masteryDefaultRowSchema,
  masteryOverridePathSchema,
  masteryOverrideRowSchema,
  masterySongIdParamSchema,
} from './mastery.schema';
import {
  defineTool,
  getMasteryDefaults,
  getMasteryOverridesForSong,
  getScoreHistoryOfSong,
  removeMasteryDefault,
  removeMasteryOverride,
  saveMasteryDefault,
  saveMasteryOverride,
} from './mastery.service';

// @FollowsBlueprint controller-dispatch
export const MASTERY_TOOLS = [
  defineTool({
    name: 'list_mastery_defaults',
    description: 'List every default mastery score, 0 to 10, per member and instrument.',
    route: 'GET /api/mastery/defaults',
    inputSchema: z.object({}),
    run: async () => ({ kind: 'answered', body: { defaults: await getMasteryDefaults() } }),
  }),
  defineTool({
    name: 'set_mastery_default',
    description:
      'Set the default mastery score, 0 to 10, of the member `memberId` on the instrument `instrumentId`.',
    route: 'PUT /api/mastery/defaults',
    inputSchema: masteryDefaultRowSchema,
    run: async (row) => {
      await saveMasteryDefault(row);
      return { kind: 'answered', body: row };
    },
  }),
  defineTool({
    name: 'delete_mastery_default',
    description:
      'Remove the default mastery score of the member `memberId` on the instrument `instrumentId`.',
    route: 'DELETE /api/mastery/defaults/:memberId/:instrumentId',
    inputSchema: masteryDefaultPathSchema,
    run: async ({ memberId, instrumentId }) => {
      const outcome = await removeMasteryDefault(memberId, instrumentId);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { memberId, instrumentId, deleted: true } };
    },
  }),
  defineTool({
    name: 'list_mastery_overrides',
    description:
      'List the mastery scores set for the song `songId` only, which win over the defaults.',
    route: 'GET /api/mastery/overrides/:songId',
    inputSchema: masterySongIdParamSchema,
    run: async ({ songId }) => ({
      kind: 'answered',
      body: { overrides: await getMasteryOverridesForSong(songId) },
    }),
  }),
  defineTool({
    name: 'get_mastery_history',
    description: 'List the changes of mastery score recorded on the song `songId`.',
    route: 'GET /api/mastery/history/:songId',
    inputSchema: masterySongIdParamSchema,
    run: async ({ songId }) => ({
      kind: 'answered',
      body: { changes: await getScoreHistoryOfSong(songId) },
    }),
  }),
  defineTool({
    name: 'set_mastery_override',
    description:
      'Set the mastery score, 0 to 10, of the member `memberId` on the instrument `instrumentId` for the song `songId` only.',
    route: 'PUT /api/mastery/overrides',
    inputSchema: masteryOverrideRowSchema,
    run: async (row, actor) => {
      await saveMasteryOverride(row, actor.now);
      return { kind: 'answered', body: row };
    },
  }),
  defineTool({
    name: 'delete_mastery_override',
    description:
      'Remove the mastery score of the member `memberId` on the instrument `instrumentId` for the song `songId`, so the default applies again.',
    route: 'DELETE /api/mastery/overrides/:memberId/:instrumentId/:songId',
    inputSchema: masteryOverridePathSchema,
    run: async (key, actor) => {
      const outcome = await removeMasteryOverride(key, actor.now);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { ...key, deleted: true } };
    },
  }),
];
