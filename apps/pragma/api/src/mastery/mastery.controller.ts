/**
 * Mastery endpoints. Hono routing + Zod parsing only; orchestration in
 * the service. The `effective = override ?? default` projection and
 * row/column averages live in `mastery.core.ts`.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { getDatabase } from '../database/client';
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

export function buildMasteryRouter(): Hono {
  const router = new Hono();

  router.get('/defaults', async (context) => {
    const defaults = await getMasteryDefaults(getDatabase());
    return context.json({ defaults });
  });

  router.put('/defaults', zValidator('json', masteryDefaultRowSchema), async (context) => {
    const row = context.req.valid('json');
    await saveMasteryDefault(getDatabase(), row);
    return context.json(row);
  });

  router.delete(
    '/defaults/:memberId/:instrumentId',
    zValidator('param', masteryDefaultPathSchema),
    async (context) => {
      const { memberId, instrumentId } = context.req.valid('param');
      const ok = await removeMasteryDefault(getDatabase(), memberId, instrumentId);
      if (!ok) return context.json({ error: 'not-found' }, 404);
      return context.json({ memberId, instrumentId, deleted: true });
    },
  );

  router.get(
    '/overrides/:songId',
    zValidator('param', masterySongIdParamSchema),
    async (context) => {
      const { songId } = context.req.valid('param');
      const overrides = await getMasteryOverridesForSong(getDatabase(), songId);
      return context.json({ overrides });
    },
  );

  router.put('/overrides', zValidator('json', masteryOverrideRowSchema), async (context) => {
    const row = context.req.valid('json');
    await saveMasteryOverride(getDatabase(), row);
    return context.json(row);
  });

  router.delete(
    '/overrides/:memberId/:instrumentId/:songId',
    zValidator('param', masteryOverridePathSchema),
    async (context) => {
      const { memberId, instrumentId, songId } = context.req.valid('param');
      const ok = await removeMasteryOverride(getDatabase(), memberId, instrumentId, songId);
      if (!ok) return context.json({ error: 'not-found' }, 404);
      return context.json({ memberId, instrumentId, songId, deleted: true });
    },
  );

  return router;
}
