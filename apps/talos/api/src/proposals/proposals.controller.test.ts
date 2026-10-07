import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTestContext, requestJson, signIn, useTestSecrets } from '../../../test/app-utils';
import { CONTENT_FIXTURE } from '../../../test/content-fixture';
import { truncateAllTables } from '../../../test/database-utils';

beforeEach(async () => {
  await truncateAllTables();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// @FollowsBlueprint test-back-e2e
describe('the proposal routes', () => {
  it('lists the proposals newest first, without the files that are not proposals', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/proposals', { cookie: await signIn() });
    const proposals: { slug: string }[] = await response.json();
    expect(proposals.map((proposal) => proposal.slug)).toEqual([
      '2026-10-04-cv',
      '2026-10-03-vieille',
    ]);
  });

  it('filters by status', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/proposals?status=acceptee', {
      cookie: await signIn(),
    });
    expect(await response.json()).toEqual([]);
  });

  it('accepts a proposal, commits the decision and fires the routine', async () => {
    const fetcher = vi.fn(async () => await Promise.resolve(new Response('{}', { status: 200 })));
    vi.stubGlobal('fetch', fetcher);
    const { app, overlay } = buildTestContext(CONTENT_FIXTURE);
    useTestSecrets({
      'fire-url': 'https://api.anthropic.com/v1/routines/r1/fire',
      'fire-token': 'jeton',
      'secret-phrase': 'phrase',
    });
    const response = await requestJson(app, '/api/proposals/2026-10-04-cv/decision', {
      method: 'POST',
      body: { decision: 'acceptee', comment: 'vas-y' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ slug: '2026-10-04-cv', status: 'acceptee' });
    expect(overlay.get('etat/propositions/2026-10-04-cv.md')).toMatch(/: acceptée — vas-y/);
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/routines/r1/fire',
      expect.objectContaining({
        body: JSON.stringify({ text: 'phrase\nproposition: etat/propositions/2026-10-04-cv.md' }),
      }),
    );
  });

  it('commits the decision even when no routine is configured', async () => {
    const { app, overlay } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/proposals/2026-10-04-cv/decision', {
      method: 'POST',
      body: { decision: 'refusee' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(200);
    expect(overlay.get('etat/propositions/2026-10-04-cv.md')).toContain('statut: refusee');
  });

  it('refuses to decide twice', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const cookie = await signIn();
    const decide = async () =>
      await requestJson(app, '/api/proposals/2026-10-04-cv/decision', {
        method: 'POST',
        body: { decision: 'refusee' },
        cookie,
      });
    await decide();
    const response = await decide();
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'Cette proposition est déjà tranchée.' });
  });

  it('answers 404 for an unknown proposal', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/proposals/2026-01-01-absente/decision', {
      method: 'POST',
      body: { decision: 'acceptee' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(404);
  });
  it('cancels a decision: back to proposee, history kept, no routine fired', async () => {
    const fetcher = vi.fn(async () => await Promise.resolve(new Response('{}', { status: 200 })));
    vi.stubGlobal('fetch', fetcher);
    const { app, overlay } = buildTestContext(CONTENT_FIXTURE);
    const cookie = await signIn();
    await requestJson(app, '/api/proposals/2026-10-04-cv/decision', {
      method: 'POST',
      body: { decision: 'acceptee' },
      cookie,
    });
    useTestSecrets({
      'fire-url': 'https://api.anthropic.com/v1/routines/r1/fire',
      'fire-token': 'jeton',
      'secret-phrase': 'phrase',
    });
    const response = await requestJson(app, '/api/proposals/2026-10-04-cv/decision', {
      method: 'DELETE',
      cookie,
    });
    expect(response.status).toBe(200);
    const proposal: { status: string; decisions: string[] } = await response.json();
    expect(proposal.status).toBe('proposee');
    expect(proposal.decisions).toHaveLength(2);
    expect(proposal.decisions[1]).toMatch(/ : décision annulée$/);
    const file = overlay.get('etat/propositions/2026-10-04-cv.md');
    expect(file).toContain('statut: proposee');
    expect(file).toMatch(/: acceptée\n- .* : décision annulée\n/);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('refuses to cancel a proposal that has no decision', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/proposals/2026-10-04-cv/decision', {
      method: 'DELETE',
      cookie: await signIn(),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Aucune décision à annuler : la proposition est en attente ou déjà traitée.',
    });
  });

  it('answers 404 when cancelling on an unknown proposal', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/proposals/2026-01-01-absente/decision', {
      method: 'DELETE',
      cookie: await signIn(),
    });
    expect(response.status).toBe(404);
  });
});
