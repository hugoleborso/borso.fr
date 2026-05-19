/**
 * Transition-comment endpoints. Comments are stored on the **ordered
 * pair** (songA, songB) — the unique index in the DB matches the spec
 * decision (A→B is a different musical transition from B→A).
 *
 * Routes:
 *  - GET    /api/transition-comments               — list all comments.
 *  - GET    /api/transition-comments/:a/:b         — read one pair.
 *  - PUT    /api/transition-comments/:a/:b         — upsert.
 *  - DELETE /api/transition-comments/:a/:b         — clear.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDatabase } from '../database/client';
import { transitionCommentTable } from '../database/schema';

const pairParamSchema = z.object({
  a: z.string().uuid(),
  b: z.string().uuid(),
});

const commentBodySchema = z.object({
  comment: z.string().trim().min(1).max(4_096),
});

const PROJECTION = {
  songAId: transitionCommentTable.songAId,
  songBId: transitionCommentTable.songBId,
  comment: transitionCommentTable.comment,
  updatedAt: transitionCommentTable.updatedAt,
} as const;

export function buildTransitionCommentsRouter(): Hono {
  const router = new Hono();

  router.get('/', async (context) => {
    const database = getDatabase();
    const rows = await database.select(PROJECTION).from(transitionCommentTable);
    return context.json({ comments: rows });
  });

  router.get('/:a/:b', zValidator('param', pairParamSchema), async (context) => {
    const database = getDatabase();
    const { a, b } = context.req.valid('param');
    const rows = await database
      .select(PROJECTION)
      .from(transitionCommentTable)
      .where(
        and(eq(transitionCommentTable.songAId, a), eq(transitionCommentTable.songBId, b)),
      )
      .limit(1);
    const row = rows[0];
    if (row === undefined) return context.json({ error: 'not-found' }, 404);
    return context.json({ comment: row });
  });

  router.put(
    '/:a/:b',
    zValidator('param', pairParamSchema),
    zValidator('json', commentBodySchema),
    async (context) => {
      const database = getDatabase();
      const { a, b } = context.req.valid('param');
      const { comment } = context.req.valid('json');
      await database
        .insert(transitionCommentTable)
        .values({ songAId: a, songBId: b, comment })
        .onConflictDoUpdate({
          target: [transitionCommentTable.songAId, transitionCommentTable.songBId],
          set: { comment, updatedAt: new Date() },
        });
      return context.json({ songAId: a, songBId: b, comment });
    },
  );

  router.delete(
    '/:a/:b',
    zValidator('param', pairParamSchema),
    async (context) => {
      const database = getDatabase();
      const { a, b } = context.req.valid('param');
      const deleted = await database
        .delete(transitionCommentTable)
        .where(
          and(eq(transitionCommentTable.songAId, a), eq(transitionCommentTable.songBId, b)),
        )
        .returning({ id: transitionCommentTable.id });
      if (deleted.length === 0) return context.json({ error: 'not-found' }, 404);
      return context.json({ songAId: a, songBId: b, deleted: true });
    },
  );

  return router;
}
