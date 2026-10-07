import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import '../../i18n/i18n.setup';
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
import { ProposalBoard } from './ProposalBoard';
import { ToastViewport } from './ToastViewport';

interface StoredProposal {
  slug: string;
  category: string;
  status: string;
  title: string;
  priority: string;
  createdOn: string;
  why: string;
  draft: string;
  decisions: string[];
}

function buildProposal(slug: string, status: string, title: string): StoredProposal {
  return {
    slug,
    category: 'action',
    status,
    title,
    priority: 'normale',
    createdOn: '2026-10-04',
    why: 'Parce que.',
    draft: 'Un message.',
    decisions: [],
  };
}

const DECISION_PATH = /^\/api\/proposals\/([a-z0-9-]+)\/decision$/;
const decisionBodySchema = z.object({ decision: z.string() });

function serveProposals(proposals: StoredProposal[]): FetchStub {
  return stubFetch(async (request) => {
    const path = new URL(request.url).pathname;
    if (path === '/api/proposals') return jsonResponse(proposals);
    const slug = DECISION_PATH.exec(path)?.[1];
    const proposal = proposals.find((candidate) => candidate.slug === slug);
    if (proposal === undefined) return jsonResponse({ error: 'Proposition introuvable.' }, 404);
    if (request.method === 'DELETE') {
      proposal.status = 'proposee';
      proposal.decisions.push('2026-10-05 10:13 : décision annulée');
      return jsonResponse(proposal);
    }
    proposal.status = decisionBodySchema.parse(await request.json()).decision;
    return jsonResponse(proposal);
  });
}

function findButton(tree: MountedTree, text: string): HTMLButtonElement | undefined {
  return [...tree.container.querySelectorAll('button')].find(
    (button) => button.textContent === text,
  );
}

function mountBoard(): MountedTree {
  return mountWithClient(
    createIsolatedQueryClient(),
    <>
      <ProposalBoard />
      <ToastViewport />
    </>,
  );
}

describe('going back on a proposal decision', () => {
  let fetchStub: FetchStub | null = null;

  afterEach(() => {
    act(() => {
      dismissToast();
    });
    fetchStub?.restore();
  });

  it('undoes an acceptance from the toast and reopens the form with the comment field', async () => {
    fetchStub = serveProposals([buildProposal('2026-10-04-cv', 'proposee', 'Envoyer le CV')]);
    const tree = mountBoard();
    await flushUntil(() => findButton(tree, 'Accepter') !== undefined);
    expect(tree.container.querySelector('textarea')).toBeNull();
    act(() => {
      findButton(tree, 'Accepter')?.click();
    });
    await flushUntil(() => findButton(tree, 'Annuler') !== undefined);
    act(() => {
      findButton(tree, 'Annuler')?.click();
    });
    await flushUntil(() => tree.container.querySelector('textarea') !== null);
    expect(findButton(tree, 'Accepter')).toBeDefined();
    expect(fetchStub.calls.map((request) => request.method)).toContain('DELETE');
    tree.unmount();
  });

  it('reopens a proposal decided earlier from the history', async () => {
    fetchStub = serveProposals([buildProposal('2026-10-03-salle', 'refusee', 'Réserver la salle')]);
    const tree = mountBoard();
    await flushUntil(() => findButton(tree, 'Revenir sur ma décision') !== undefined);
    expect(findButton(tree, 'Refuser')).toBeUndefined();
    act(() => {
      findButton(tree, 'Revenir sur ma décision')?.click();
    });
    await flushUntil(() => findButton(tree, 'Refuser') !== undefined);
    expect(tree.container.querySelector('textarea')).not.toBeNull();
    await flushUntil(() => tree.container.textContent.includes('Décision annulée'));
    tree.unmount();
  });

  it('offers no way back on a proposal Talos has already carried out', async () => {
    fetchStub = serveProposals([buildProposal('2026-10-02-fait', 'faite', 'Déjà fait')]);
    const tree = mountBoard();
    await flushUntil(() => tree.container.textContent.includes('Déjà fait'));
    expect(findButton(tree, 'Revenir sur ma décision')).toBeUndefined();
    tree.unmount();
  });
});
