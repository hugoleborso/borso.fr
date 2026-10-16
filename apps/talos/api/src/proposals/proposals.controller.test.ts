import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTestContext, requestJson, signIn, useTestSecrets } from '../../../test/app-utils';
import { CONTENT_FIXTURE } from '../../../test/content-fixture';
import { truncateAllTables } from '../../../test/database-utils';
import { readMemoryEvents, seedMemoryInDatabase } from '../../../test/memory-fixture';

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

const STORED_PROPOSAL = '2026-10-04-atelier';

async function readStoredProposalPage(): Promise<string> {
  const { app } = buildTestContext({});
  const response = await requestJson(
    app,
    `/api/agent/page?slug=etat/propositions/${STORED_PROPOSAL}`,
    { headers: { authorization: 'Bearer jeton-agent-mac' } },
  );
  const page: { markdown: string } = await response.json();
  return page.markdown;
}

describe('the proposal routes once the memory is in the database', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-05T08:12:00Z'));
    await seedMemoryInDatabase();
    return () => {
      vi.useRealTimers();
    };
  });

  it('lists the stored proposals with the shape of the git ones', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/proposals', { cookie: await signIn() });
    expect(await response.json()).toEqual([
      {
        slug: STORED_PROPOSAL,
        category: 'action',
        status: 'proposee',
        title: "Décaler la réunion pour l'atelier Acme",
        priority: 'haute',
        createdOn: '2026-10-04',
        expiresOn: '2026-10-09',
        why: "L'atelier Acme approche.",
        draft: "Décaler la réunion d'équipe.",
        decisions: [],
      },
    ]);
  });

  it('records the decision in the memory and fires the routine with the slug', async () => {
    const fetcher = vi.fn(async () => await Promise.resolve(new Response('{}', { status: 200 })));
    vi.stubGlobal('fetch', fetcher);
    const { app, overlay } = buildTestContext(CONTENT_FIXTURE);
    useTestSecrets({
      'fire-url': 'https://api.anthropic.com/v1/routines/r1/fire',
      'fire-token': 'jeton',
      'secret-phrase': 'phrase',
    });
    const cookie = await signIn();
    const response = await requestJson(app, `/api/proposals/${STORED_PROPOSAL}/decision`, {
      method: 'POST',
      body: { decision: 'acceptee', comment: 'vas-y' },
      cookie,
    });
    expect(await response.json()).toMatchObject({
      status: 'acceptee',
      decisions: ['2026-10-05 10:12 : acceptée — vas-y'],
    });
    expect(overlay.size).toBe(0);
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/routines/r1/fire',
      expect.objectContaining({
        body: JSON.stringify({ text: `phrase\nproposition: etat/propositions/${STORED_PROPOSAL}` }),
      }),
    );
    const page = await readStoredProposalPage();
    expect(page).toContain('statut: acceptee');
    expect(page).toContain('## Décision\n- 2026-10-05 10:12 : acceptée — vas-y');
    const again = await requestJson(app, `/api/proposals/${STORED_PROPOSAL}/decision`, {
      method: 'POST',
      body: { decision: 'refusee' },
      cookie,
    });
    expect(again.status).toBe(409);
  });

  it('cancels a decision in the memory without firing anything', async () => {
    const fetcher = vi.fn(async () => await Promise.resolve(new Response('{}', { status: 200 })));
    vi.stubGlobal('fetch', fetcher);
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const cookie = await signIn();
    await requestJson(app, `/api/proposals/${STORED_PROPOSAL}/decision`, {
      method: 'POST',
      body: { decision: 'refusee' },
      cookie,
    });
    const response = await requestJson(app, `/api/proposals/${STORED_PROPOSAL}/decision`, {
      method: 'DELETE',
      cookie,
    });
    expect(await response.json()).toMatchObject({
      status: 'proposee',
      decisions: ['2026-10-05 10:12 : refusée', '2026-10-05 10:12 : décision annulée'],
    });
    expect(fetcher).not.toHaveBeenCalled();
    const operations = (await readMemoryEvents())
      .filter((event) => event.actor === 'pwa')
      .map((event) => event.operation);
    expect(operations).toEqual(['proposal.status', 'proposal.status']);
  });

  it('answers 404 for a proposal the memory does not hold', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/proposals/2026-10-04-cv/decision', {
      method: 'POST',
      body: { decision: 'acceptee' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(404);
  });
});
