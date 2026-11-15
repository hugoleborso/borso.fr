import { sql } from 'drizzle-orm';
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
const PROPOSAL_WITH_OPTIONS = '2026-10-03-seance-course';
const OPTION_NOT_OFFERED = { error: "Ce choix n'est pas proposé." };
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

async function readStoredProposalPage(slug = STORED_PROPOSAL): Promise<string> {
  const { app } = buildTestContext();
  const response = await requestJson(app, `/api/agent/page?slug=etat/propositions/${slug}`, {
    headers: { authorization: 'Bearer jeton-agent-mac' },
  });
  const page: { markdown: string } = await response.json();
  return page.markdown;
}

async function sendTogether(send: () => Promise<Response>): Promise<number[]> {
  const answers = await Promise.all([send(), send()]);
  return answers.map((answer) => answer.status).toSorted((left, right) => left - right);
}

async function countPwaStatusChanges(): Promise<number> {
  return (await readMemoryEvents()).filter((event) => event.actor === 'pwa').length;
}

async function changeStatusAsAgent(expectedStatus: string | undefined): Promise<Response> {
  const { app } = buildTestContext();
  return await requestJson(app, '/api/agent/changes', {
    method: 'POST',
    headers: { authorization: 'Bearer jeton-agent-mac' },
    body: {
      idempotencyKey: `statut-${String(expectedStatus)}`,
      actor: 'talos-test',
      operations: [
        {
          op: 'proposal.status',
          slug: `etat/propositions/${STORED_PROPOSAL}`,
          status: 'traitee',
          ...(expectedStatus === undefined ? {} : { expectedStatus }),
        },
      ],
    },
  });
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
        options: [],
        decisions: [],
      },
      {
        slug: PROPOSAL_WITH_OPTIONS,
        category: 'logistique',
        status: 'proposee',
        title: 'Caler la séance de course de la semaine',
        priority: 'normale',
        createdOn: '2026-10-03',
        expiresOn: '2026-10-09',
        why: "Aucune séance de course n'est posée cette semaine.",
        draft: 'Bloquer une heure de course à pied en fin de journée.',
        options: ['mardi', 'jeudi', 'pas cette semaine'],
        decisions: [],
      },
    ]);
  });

  it('records the chosen option in the decision line and fires the routine', async () => {
    const fetcher = vi.fn(async () => await answerSession(SESSION_URL));
    vi.stubGlobal('fetch', fetcher);
    const { app } = buildTestContext();
    configureRoutine();
    const response = await requestJson(app, `/api/proposals/${PROPOSAL_WITH_OPTIONS}/decision`, {
      method: 'POST',
      body: { decision: 'acceptee', option: 'jeudi', comment: 'le soir' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: 'acceptee',
      decisions: ['2026-10-05 10:12 : acceptée (jeudi) — le soir'],
    });
    expect(fetcher).toHaveBeenCalledWith(
      FIRE_URL,
      expect.objectContaining({
        body: JSON.stringify({
          text: `phrase\nproposition: etat/propositions/${PROPOSAL_WITH_OPTIONS}\nchoix: jeudi`,
        }),
      }),
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await getDatabase().select().from(routineRunTable)).toEqual([
      {
        id: expect.any(String),
        firedAt: new Date('2026-10-05T08:12:00Z'),
        trigger: 'proposition',
        subject: `etat/propositions/${PROPOSAL_WITH_OPTIONS}`,
        sessionUrl: SESSION_URL,
      },
    ]);
    const page = await readStoredProposalPage(PROPOSAL_WITH_OPTIONS);
    expect(page).toContain('statut: acceptee');
    expect(page).toContain('## Décision\n- 2026-10-05 10:12 : acceptée (jeudi) — le soir');
  });

  it('records a choice with the longest comment the API accepts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => await answerSession(SESSION_URL)),
    );
    const { app } = buildTestContext();
    const comment = 'x'.repeat(2000);
    const response = await requestJson(app, `/api/proposals/${PROPOSAL_WITH_OPTIONS}/decision`, {
      method: 'POST',
      body: { decision: 'acceptee', option: 'pas cette semaine', comment },
      cookie: await signIn(),
    });
    expect(response.status).toBe(200);
    const page = await readStoredProposalPage(PROPOSAL_WITH_OPTIONS);
    expect(page).toContain(`- 2026-10-05 10:12 : acceptée (pas cette semaine) — ${comment}`);
  });

  it.each([
    [
      'an option the proposal does not offer',
      PROPOSAL_WITH_OPTIONS,
      { decision: 'acceptee', option: 'vendredi' },
    ],
    [
      'an option sent with a refusal',
      PROPOSAL_WITH_OPTIONS,
      { decision: 'refusee', option: 'mardi' },
    ],
    [
      'a plain acceptance of a proposal with options',
      PROPOSAL_WITH_OPTIONS,
      { decision: 'acceptee' },
    ],
    [
      'an option on a proposal without options',
      STORED_PROPOSAL,
      { decision: 'acceptee', option: 'mardi' },
    ],
  ])('answers 400 and records nothing for %s', async (_case, slug, body) => {
    const fetcher = vi.fn(async () => await answerSession(SESSION_URL));
    vi.stubGlobal('fetch', fetcher);
    const { app } = buildTestContext();
    configureRoutine();
    const response = await requestJson(app, `/api/proposals/${slug}/decision`, {
      method: 'POST',
      body,
      cookie: await signIn(),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(OPTION_NOT_OFFERED);
    expect(await readStoredProposalPage(slug)).toContain('statut: proposee');
    expect(await countPwaStatusChanges()).toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('refuses a proposal with options without a choice, and offers the choices again after a cancellation', async () => {
    const { app } = buildTestContext();
    const cookie = await signIn();
    const refused = await requestJson(app, `/api/proposals/${PROPOSAL_WITH_OPTIONS}/decision`, {
      method: 'POST',
      body: { decision: 'refusee' },
      cookie,
    });
    expect(refused.status).toBe(200);
    const reopened = await requestJson(app, `/api/proposals/${PROPOSAL_WITH_OPTIONS}/decision`, {
      method: 'DELETE',
      cookie,
    });
    expect(await reopened.json()).toMatchObject({
      status: 'proposee',
      options: ['mardi', 'jeudi', 'pas cette semaine'],
    });
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

  it('lets one of two decisions sent together win, and refuses the other without firing', async () => {
    const fetcher = vi.fn(async () => await answerSession(SESSION_URL));
    vi.stubGlobal('fetch', fetcher);
    const { app } = buildTestContext();
    configureRoutine();
    const cookie = await signIn();
    const statuses = await sendTogether(
      async () =>
        await requestJson(app, `/api/proposals/${STORED_PROPOSAL}/decision`, {
          method: 'POST',
          body: { decision: 'acceptee' },
          cookie,
        }),
    );
    expect(statuses).toEqual([200, 409]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await getDatabase().select().from(routineRunTable)).toHaveLength(1);
    expect((await readStoredProposalPage()).match(/ : acceptée/g)).toHaveLength(1);
    expect(await countPwaStatusChanges()).toBe(1);
  });

  it('lets one of two cancellations sent together win, and refuses the other', async () => {
    const { app } = buildTestContext();
    const cookie = await signIn();
    await requestJson(app, `/api/proposals/${STORED_PROPOSAL}/decision`, {
      method: 'POST',
      body: { decision: 'refusee' },
      cookie,
    });
    const statuses = await sendTogether(
      async () =>
        await requestJson(app, `/api/proposals/${STORED_PROPOSAL}/decision`, {
          method: 'DELETE',
          cookie,
        }),
    );
    expect(statuses).toEqual([200, 409]);
    const page = await readStoredProposalPage();
    expect(page).toContain('statut: proposee');
    expect(page.match(/ : décision annulée/g)).toHaveLength(1);
    expect(await countPwaStatusChanges()).toBe(2);
  });

  it('refuses a status change whose expected status is stale, and writes nothing', async () => {
    const response = await changeStatusAsAgent('acceptee');
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: `statut attendu périmé : etat/propositions/${STORED_PROPOSAL}`,
    });
    expect(await readStoredProposalPage()).toContain('statut: proposee');
  });

  it.each([
    ['the expected status is the stored one', 'proposee'],
    ['no expected status is given', undefined],
  ])('changes the status when %s', async (_case, expectedStatus) => {
    const response = await changeStatusAsAgent(expectedStatus);
    expect(response.status).toBe(200);
    expect(await readStoredProposalPage()).toContain('statut: traitee');
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

  it('records a refusal in the memory without firing the routine', async () => {
    const fetcher = vi.fn(async () => await answerSession(SESSION_URL));
    vi.stubGlobal('fetch', fetcher);
    const { app } = buildTestContext();
    configureRoutine();
    const response = await requestJson(app, `/api/proposals/${STORED_PROPOSAL}/decision`, {
      method: 'POST',
      body: { decision: 'refusee' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(200);
    expect(await readStoredProposalPage()).toContain('statut: refusee');
    expect(fetcher).not.toHaveBeenCalled();
    expect(await getDatabase().select().from(routineRunTable)).toEqual([]);
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

  it('answers the decision unchanged when the run cannot be stored', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    answerFireWith(async () => await answerSession('https://claude.ai/code/session_1'));
    const { app } = buildTestContext();
    configureRoutine();
    const cookie = await signIn();
    await getDatabase().execute(sql`alter table routine_run rename to routine_run_away`);
    const decide = async (): Promise<Response> =>
      await requestJson(app, `/api/proposals/${STORED_PROPOSAL}/decision`, {
        method: 'POST',
        body: { decision: 'acceptee' },
        cookie,
      });
    const response = await decide().catch((error: unknown) => error);
    await getDatabase().execute(sql`alter table routine_run_away rename to routine_run`);
    if (!(response instanceof Response)) throw response;
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
