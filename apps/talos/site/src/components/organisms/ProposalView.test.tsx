import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import '../../i18n/i18n.setup';
import { App } from '../../App';
import {
  createIsolatedQueryClient,
  type FetchStub,
  flushUntil,
  jsonResponse,
  type MountedTree,
  mountWithClient,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { dismissToast } from '../../lib/toast.hook';

const DONE_SLUG = '2026-11-11-faits';
const LEARNED_SLUG = '2026-11-11-appris-relances-le-lundi';
const DONE_DRAFT = '- Envoyer le devis à Acme\n- Rappeler le plombier\n- Réserver la salle';
const LEARNED_DRAFT = '```diff\n- Relancer le vendredi\n+ Relancer le lundi matin\n```';

const DECIDED_SLUG = '2026-11-09-salle';
const EXPIRED_SLUG = '2026-11-01-vieille';

function buildProposal(slug: string, title: string, draft: string) {
  return {
    slug,
    category: 'action',
    status: 'proposee',
    title,
    priority: 'normale',
    createdOn: '2026-11-11',
    why: 'Trois engagements semblent tenus :\n\n- le devis est parti\n- le plombier a rappelé',
    draft,
    decisions: [],
  };
}

const DECISION_PATH = /^\/api\/proposals\/([a-z0-9-]+)\/decision$/;
const decisionBodySchema = z.object({ decision: z.string() });

function serveApp(): FetchStub {
  const proposals = [
    buildProposal(DONE_SLUG, 'Déjà faits ?', DONE_DRAFT),
    buildProposal(LEARNED_SLUG, 'Relancer le lundi', LEARNED_DRAFT),
    {
      ...buildProposal(DECIDED_SLUG, 'Réserver la salle', 'Un message.'),
      status: 'refusee',
      decisions: ['2026-11-10 09:30 : refusée — pas cette semaine'],
    },
    { ...buildProposal(EXPIRED_SLUG, 'Vieille idée', 'Un message.'), expiresOn: '2026-11-02' },
  ];
  return stubFetch(async (request) => {
    const path = new URL(request.url).pathname;
    if (path === '/api/session') return jsonResponse({ signedIn: true, registered: true });
    if (path === '/api/proposals') return jsonResponse(proposals);
    const slug = DECISION_PATH.exec(path)?.[1];
    const proposal = proposals.find((candidate) => candidate.slug === slug);
    if (proposal === undefined) return jsonResponse({ error: 'non' }, 500);
    proposal.status = decisionBodySchema.parse(await request.json()).decision;
    return jsonResponse(proposal);
  });
}

function findButton(tree: MountedTree, text: string): HTMLButtonElement | undefined {
  return [...tree.container.querySelectorAll('button')].find(
    (button) => button.textContent === text,
  );
}

function openLink(path: string): MountedTree {
  window.history.replaceState(null, '', path);
  return mountWithClient(createIsolatedQueryClient(), <App />);
}

describe('the direct link to a proposal card', () => {
  let fetchStub: FetchStub | null = null;

  afterEach(() => {
    act(() => {
      dismissToast();
    });
    fetchStub?.restore();
    window.history.replaceState(null, '', '/');
  });

  it('opens the one card with its decision buttons, and one tap decides it', async () => {
    fetchStub = serveApp();
    const tree = openLink(`/proposals/${DONE_SLUG}`);
    await flushUntil(() => findButton(tree, 'Accepter') !== undefined);
    expect(window.location.pathname).toBe(`/proposals/${DONE_SLUG}`);
    expect([...tree.container.querySelectorAll('h2')].map((title) => title.textContent)).toEqual([
      'Déjà faits ?',
    ]);
    expect(findButton(tree, 'Refuser')).toBeDefined();
    expect(tree.container.querySelector('button[aria-label="Commenter"]')).not.toBeNull();
    act(() => {
      findButton(tree, 'Accepter')?.click();
    });
    await flushUntil(() => findButton(tree, 'Revenir sur ma décision') !== undefined);
    expect(findButton(tree, 'Accepter')).toBeUndefined();
    expect(
      fetchStub.calls.map((request) => `${request.method} ${new URL(request.url).pathname}`),
    ).toContain(`POST /api/proposals/${DONE_SLUG}/decision`);
    tree.unmount();
  });

  it('shows the commitments of a grouped proposal one per line, and its reason as a list', async () => {
    fetchStub = serveApp();
    const tree = openLink(`/proposals/${DONE_SLUG}`);
    await flushUntil(() => tree.container.querySelector('pre') !== null);
    expect(tree.container.querySelector('pre')?.textContent).toBe(DONE_DRAFT);
    expect(
      [...tree.container.querySelectorAll('li')].map((item) => item.textContent.trim()),
    ).toEqual(expect.arrayContaining(['le devis est parti', 'le plombier a rappelé']));
    tree.unmount();
  });

  it('shows the diff of a lesson to validate in a preformatted block, line by line', async () => {
    fetchStub = serveApp();
    const tree = openLink(`/proposals/${LEARNED_SLUG}`);
    await flushUntil(() => tree.container.querySelector('pre') !== null);
    expect(tree.container.querySelector('pre')?.textContent.split('\n')).toEqual(
      expect.arrayContaining(['- Relancer le vendredi', '+ Relancer le lundi matin']),
    );
    tree.unmount();
  });

  it('shows the status and the decision lines of a decided proposal, with the way back', async () => {
    fetchStub = serveApp();
    const tree = openLink(`/proposals/${DECIDED_SLUG}`);
    await flushUntil(() => findButton(tree, 'Revenir sur ma décision') !== undefined);
    const row = tree.container.querySelector('li');
    expect(row?.textContent).toContain('Réserver la salle');
    expect(row?.textContent).toContain('Refusée');
    expect(row?.textContent).toContain('2026-11-10 09:30 : refusée — pas cette semaine');
    expect(findButton(tree, 'Accepter')).toBeUndefined();
    tree.unmount();
  });

  it('shows an expired proposal as expired, with nothing left to decide or take back', async () => {
    fetchStub = serveApp();
    const tree = openLink(`/proposals/${EXPIRED_SLUG}`);
    await flushUntil(() => tree.container.textContent.includes('Vieille idée'));
    expect(tree.container.textContent).toContain('Expirée');
    expect(findButton(tree, 'Accepter')).toBeUndefined();
    expect(findButton(tree, 'Refuser')).toBeUndefined();
    expect(findButton(tree, 'Revenir sur ma décision')).toBeUndefined();
    tree.unmount();
  });

  it('says so when the link names no proposal', async () => {
    fetchStub = serveApp();
    const tree = openLink('/proposals/2026-01-01-inconnue');
    await flushUntil(() => tree.container.textContent.includes('Proposition introuvable'));
    expect(findButton(tree, 'Accepter')).toBeUndefined();
    tree.unmount();
  });
});
