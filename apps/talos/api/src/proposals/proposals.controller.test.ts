import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTestContext, requestJson, signIn, useTestSecrets } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { readMemoryEvents, seedMemoryInDatabase } from '../../../test/memory-fixture';
import { getDatabase } from '../database/client';
import { routineRunTable } from '../routine/routine.schema';

beforeEach(async () => {
  await truncateAllTables();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const STORED_PROPOSAL = '2026-10-04-atelier';
const FIRE_URL = 'https://api.anthropic.com/v1/routines/r1/fire';
const SESSION_URL = 'https://claude.ai/code/session_01ExempleInvente';
const DECIDED_PROPOSAL = {
  status: 'acceptee',
  decisions: ['2026-10-05 10:12 : acceptée'],
};

function configureRoutine(): void {
  useTestSecrets({ 'fire-url': FIRE_URL, 'fire-token': 'jeton', 'secret-phrase': 'phrase' });
}

function answerFireWith(answer: () => Promise<Response>): void {
  vi.stubGlobal('fetch', vi.fn(answer));
}

async function answerSession(sessionUrl: string): Promise<Response> {
  return await Promise.resolve(Response.json({ claude_code_session_url: sessionUrl }));
}

async function readStoredProposalPage(): Promise<string> {
  const { app } = buildTestContext();
  const response = await requestJson(
    app,
    `/api/agent/page?slug=etat/propositions/${STORED_PROPOSAL}`,
    { headers: { authorization: 'Bearer jeton-agent-mac' } },
  );
  const page: { markdown: string } = await response.json();
  return page.markdown;
}

// @FollowsBlueprint test-back-e2e
describe('the proposal routes', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-05T08:12:00Z'));
    await seedMemoryInDatabase();
    return () => {
      vi.useRealTimers();
    };
  });

  it('lists the stored proposals', async () => {
    const { app } = buildTestContext();
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
    const fetcher = vi.fn(async () => await answerSession(SESSION_URL));
    vi.stubGlobal('fetch', fetcher);
    const { app } = buildTestContext();
    configureRoutine();
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
    expect(fetcher).toHaveBeenCalledWith(
      FIRE_URL,
      expect.objectContaining({
        body: JSON.stringify({ text: `phrase\nproposition: etat/propositions/${STORED_PROPOSAL}` }),
      }),
    );
    expect(await getDatabase().select().from(routineRunTable)).toEqual([
      {
        id: expect.any(String),
        firedAt: new Date('2026-10-05T08:12:00Z'),
        trigger: 'proposition',
        subject: `etat/propositions/${STORED_PROPOSAL}`,
        sessionUrl: SESSION_URL,
      },
    ]);
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
    const { app } = buildTestContext();
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
    expect(await getDatabase().select().from(routineRunTable)).toEqual([]);
    const operations = (await readMemoryEvents())
      .filter((event) => event.actor === 'pwa')
      .map((event) => event.operation);
    expect(operations).toEqual(['proposal.status', 'proposal.status']);
  });

  it('answers 404 for a proposal the memory does not hold', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/proposals/2026-10-04-cv/decision', {
      method: 'POST',
      body: { decision: 'acceptee' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(404);
  });

  it('filters by status', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/proposals?status=acceptee', {
      cookie: await signIn(),
    });
    expect(await response.json()).toEqual([]);
  });

  it('commits the decision even when no routine is configured', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, `/api/proposals/${STORED_PROPOSAL}/decision`, {
      method: 'POST',
      body: { decision: 'refusee' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(200);
    expect(await readStoredProposalPage()).toContain('statut: refusee');
    expect(await getDatabase().select().from(routineRunTable)).toEqual([]);
  });

  it.each([
    [
      'the routine refuses the fire',
      async () => await Promise.resolve(new Response('{}', { status: 500 })),
    ],
    ['the network fails', async () => await Promise.reject(new Error('réseau coupé'))],
    [
      'the run cannot be stored',
      async () => await answerSession('https://claude.ai/code/session_\u0000'),
    ],
  ])('answers the decision unchanged and stores no run when %s', async (_case, answer) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    answerFireWith(answer);
    const { app } = buildTestContext();
    configureRoutine();
    const response = await requestJson(app, `/api/proposals/${STORED_PROPOSAL}/decision`, {
      method: 'POST',
      body: { decision: 'acceptee' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject(DECIDED_PROPOSAL);
    expect(await readStoredProposalPage()).toContain('statut: acceptee');
    expect(await getDatabase().select().from(routineRunTable)).toEqual([]);
    vi.restoreAllMocks();
  });

  it('refuses to cancel a proposal that has no decision', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, `/api/proposals/${STORED_PROPOSAL}/decision`, {
      method: 'DELETE',
      cookie: await signIn(),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Aucune décision à annuler : la proposition est en attente ou déjà traitée.',
    });
  });

  it('answers 404 when cancelling on an unknown proposal', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/proposals/2026-01-01-absente/decision', {
      method: 'DELETE',
      cookie: await signIn(),
    });
    expect(response.status).toBe(404);
  });
});
