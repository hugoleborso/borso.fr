/**
 * Back-e2e for the transition-comments endpoints. Comments are stored
 * on the ordered pair (songA, songB) — A→B is a different musical
 * transition from B→A and warrants its own row.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

const commentSchema = z.object({
  songAId: z.string().uuid(),
  songBId: z.string().uuid(),
  comment: z.string(),
  updatedAt: z.string(),
});
const singleEnvelope = z.object({ comment: commentSchema });
const listEnvelope = z.object({ comments: z.array(commentSchema) });
const songEnvelope = z.object({ song: z.object({ id: z.string().uuid() }) });

async function seedTwoSongs(
  app: Awaited<ReturnType<typeof buildAuthenticatedApp>>['app'],
  cookieHeader: string,
): Promise<{ songAId: string; songBId: string }> {
  const a = await jsonRequest(app, '/api/songs', {
    method: 'POST',
    body: { title: 'A', status: 'idea' },
    cookieHeader,
  });
  const b = await jsonRequest(app, '/api/songs', {
    method: 'POST',
    body: { title: 'B', status: 'idea' },
    cookieHeader,
  });
  return {
    songAId: (await readJson(a, songEnvelope)).song.id,
    songBId: (await readJson(b, songEnvelope)).song.id,
  };
}

describe('transition-comments controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('upserts a comment on the ordered pair', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { songAId, songBId } = await seedTwoSongs(app, cookieHeader);
    await jsonRequest(app, `/api/transition-comments/${songAId}/${songBId}`, {
      method: 'PUT',
      body: { comment: 'tricky drop' },
      cookieHeader,
    });
    const fetched = await readJson(
      await jsonRequest(app, `/api/transition-comments/${songAId}/${songBId}`, {
        cookieHeader,
      }),
      singleEnvelope,
    );
    expect(fetched.comment.comment).toBe('tricky drop');

    // Update the same pair — must overwrite, not duplicate.
    await jsonRequest(app, `/api/transition-comments/${songAId}/${songBId}`, {
      method: 'PUT',
      body: { comment: 'fixed' },
      cookieHeader,
    });
    const all = await readJson(
      await jsonRequest(app, '/api/transition-comments', { cookieHeader }),
      listEnvelope,
    );
    expect(all.comments).toHaveLength(1);
    expect(all.comments[0]?.comment).toBe('fixed');
  });

  it('treats A→B and B→A as distinct rows', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { songAId, songBId } = await seedTwoSongs(app, cookieHeader);
    await jsonRequest(app, `/api/transition-comments/${songAId}/${songBId}`, {
      method: 'PUT',
      body: { comment: 'forward' },
      cookieHeader,
    });
    await jsonRequest(app, `/api/transition-comments/${songBId}/${songAId}`, {
      method: 'PUT',
      body: { comment: 'reverse' },
      cookieHeader,
    });
    const all = await readJson(
      await jsonRequest(app, '/api/transition-comments', { cookieHeader }),
      listEnvelope,
    );
    expect(all.comments).toHaveLength(2);
  });

  it('returns 404 on get / delete of a missing pair', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const missing = '11111111-1111-1111-1111-111111111111';
    expect(
      (
        await jsonRequest(app, `/api/transition-comments/${missing}/${missing}`, {
          cookieHeader,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await jsonRequest(app, `/api/transition-comments/${missing}/${missing}`, {
          method: 'DELETE',
          cookieHeader,
        })
      ).status,
    ).toBe(404);
  });

  it('rejects every verb without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    expect((await jsonRequest(app, '/api/transition-comments')).status).toBe(401);
  });
});
