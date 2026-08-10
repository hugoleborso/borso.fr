/**
 * Mastery endpoints. Hono routing + Zod parsing only; orchestration in
 * the service. The `effective = override ?? default` projection and
 * row/column averages live in `mastery.core.ts`.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireSharedPasswordSession } from '../auth/shared-password.middleware';
import {
  masteryDefaultPathSchema,
  masteryDefaultRowSchema,
  masteryOverridePathSchema,
  masteryOverrideRowSchema,
  masterySongIdParamSchema,
} from './mastery.schema';
import {
  getMasteryDefaults,
  getMasteryOverridesForSong,
  removeMasteryDefault,
  removeMasteryOverride,
  saveMasteryDefault,
  saveMasteryOverride,
} from './mastery.service';

// @FollowsBlueprint controller-dispatch
export function buildMasteryRouter() {
  return new Hono()
    .use('*', requireSharedPasswordSession)
    .get('/defaults', async (context) => {
      const defaults = await getMasteryDefaults();
      return context.json({ defaults });
    })
    .put('/defaults', zValidator('json', masteryDefaultRowSchema), async (context) => {
      const row = context.req.valid('json');
      await saveMasteryDefault(row);
      return context.json(row);
    })
    .delete(
      '/defaults/:memberId/:instrumentId',
      zValidator('param', masteryDefaultPathSchema),
      async (context) => {
        const { memberId, instrumentId } = context.req.valid('param');
        const outcome = await removeMasteryDefault(memberId, instrumentId);
        if (outcome === 'not-found') return context.json({ error: 'not-found' }, 404);
        return context.json({ memberId, instrumentId, deleted: true });
      },
    )
    .get('/overrides/:songId', zValidator('param', masterySongIdParamSchema), async (context) => {
      const { songId } = context.req.valid('param');
      const overrides = await getMasteryOverridesForSong(songId);
      return context.json({ overrides });
    })
    .put('/overrides', zValidator('json', masteryOverrideRowSchema), async (context) => {
      const row = context.req.valid('json');
      await saveMasteryOverride(row);
      return context.json(row);
    })
    .delete(
      '/overrides/:memberId/:instrumentId/:songId',
      zValidator('param', masteryOverridePathSchema),
      async (context) => {
        const { memberId, instrumentId, songId } = context.req.valid('param');
        const outcome = await removeMasteryOverride(memberId, instrumentId, songId);
        if (outcome === 'not-found') return context.json({ error: 'not-found' }, 404);
        return context.json({ memberId, instrumentId, songId, deleted: true });
      },
    );
}
