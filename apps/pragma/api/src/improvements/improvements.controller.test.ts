import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

const improvementSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  details: z.string(),
  status: z.string(),
  authorMemberId: z.string().uuid(),
  createdAt: z.string(),
  voteCount: z.number(),
  votedByViewer: z.boolean(),
});
const singleEnvelope = z.object({ improvement: improvementSchema });
const listEnvelope = z.object({ improvements: z.array(improvementSchema) });

async function createImprovement(
  app: Parameters<typeof jsonRequest>[0],
  cookieHeader: string,
  body: Record<string, unknown>,
) {
  return readJson(
    await jsonRequest(app, '/api/improvements', { method: 'POST', body, cookieHeader }),
    singleEnvelope,
  );
}

// @FollowsBlueprint test-back-e2e
describe('improvements controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects the list without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    expect((await jsonRequest(app, '/api/improvements')).status).toBe(401);
  });

  it('files a new improvement as an idea authored by the signed-in member', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const created = await createImprovement(app, cookieHeader, { title: 'Offline setlists' });
    expect(created.improvement.status).toBe('idea');
    expect(created.improvement.authorMemberId).toBe(memberId);
    expect(created.improvement.voteCount).toBe(0);
  });

  it('moves an improvement along its statuses and keeps the untouched fields', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const created = await createImprovement(app, cookieHeader, {
      title: 'Dark mode',
      details: 'the scene view is blinding at night',
    });
    const updated = await readJson(
      await jsonRequest(app, `/api/improvements/${created.improvement.id}`, {
        method: 'PUT',
        body: { status: 'shipped' },
        cookieHeader,
      }),
      singleEnvelope,
    );
    expect(updated.improvement.status).toBe('shipped');
    expect(updated.improvement.details).toBe('the scene view is blinding at night');
  });

  it('refuses an empty update and an unknown status', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const created = await createImprovement(app, cookieHeader, { title: 'Sort the catalog' });
    const empty = await jsonRequest(app, `/api/improvements/${created.improvement.id}`, {
      method: 'PUT',
      body: {},
      cookieHeader,
    });
    expect(empty.status).toBe(400);
    const unknownStatus = await jsonRequest(app, `/api/improvements/${created.improvement.id}`, {
      method: 'PUT',
      body: { status: 'wontfix' },
      cookieHeader,
    });
    expect(unknownStatus.status).toBe(400);
  });

  it('counts one vote per member, however many times it is cast', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const created = await createImprovement(app, cookieHeader, { title: 'Bulk import' });
    const votePath = `/api/improvements/${created.improvement.id}/vote`;
    await jsonRequest(app, votePath, { method: 'PUT', cookieHeader });
    const voted = await readJson(
      await jsonRequest(app, votePath, { method: 'PUT', cookieHeader }),
      singleEnvelope,
    );
    expect(voted.improvement.voteCount).toBe(1);
    expect(voted.improvement.votedByViewer).toBe(true);
  });

  it('withdraws a vote and leaves the improvement in place', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const created = await createImprovement(app, cookieHeader, { title: 'Keyboard shortcuts' });
    const votePath = `/api/improvements/${created.improvement.id}/vote`;
    await jsonRequest(app, votePath, { method: 'PUT', cookieHeader });
    const withdrawn = await readJson(
      await jsonRequest(app, votePath, { method: 'DELETE', cookieHeader }),
      singleEnvelope,
    );
    expect(withdrawn.improvement.voteCount).toBe(0);
    expect(withdrawn.improvement.votedByViewer).toBe(false);
  });

  it('answers 404 when voting on an improvement that is not there', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, `/api/improvements/${crypto.randomUUID()}/vote`, {
      method: 'PUT',
      cookieHeader,
    });
    expect(response.status).toBe(404);
    const withdrawal = await jsonRequest(app, `/api/improvements/${crypto.randomUUID()}/vote`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect(withdrawal.status).toBe(404);
  });

  it('ranks the open statuses first and the most voted first inside a status', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const shipped = await createImprovement(app, cookieHeader, {
      title: 'Shipped one',
      status: 'shipped',
    });
    await jsonRequest(app, `/api/improvements/${shipped.improvement.id}/vote`, {
      method: 'PUT',
      cookieHeader,
    });
    await createImprovement(app, cookieHeader, { title: 'Quiet idea' });
    const loud = await createImprovement(app, cookieHeader, { title: 'Loud idea' });
    await jsonRequest(app, `/api/improvements/${loud.improvement.id}/vote`, {
      method: 'PUT',
      cookieHeader,
    });
    const list = await readJson(
      await jsonRequest(app, '/api/improvements', { cookieHeader }),
      listEnvelope,
    );
    expect(list.improvements.map((row) => row.title)).toEqual([
      'Loud idea',
      'Quiet idea',
      'Shipped one',
    ]);
  });

  it('deletes an improvement with its votes and answers 404 the second time', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const created = await createImprovement(app, cookieHeader, { title: 'Remove me' });
    await jsonRequest(app, `/api/improvements/${created.improvement.id}/vote`, {
      method: 'PUT',
      cookieHeader,
    });
    const path = `/api/improvements/${created.improvement.id}`;
    expect((await jsonRequest(app, path, { method: 'DELETE', cookieHeader })).status).toBe(200);
    expect((await jsonRequest(app, path, { method: 'DELETE', cookieHeader })).status).toBe(404);
  });
});
