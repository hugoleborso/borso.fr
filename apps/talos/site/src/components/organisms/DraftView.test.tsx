import { act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
import { DraftBoard } from './DraftBoard';
import { DraftView } from './DraftView';
import { ToastViewport } from './ToastViewport';

interface StoredDraft {
  slug: string;
  channel: string;
  recipients: { name: string; page?: string }[];
  subject?: string;
  status: string;
  createdOn: string;
  sentOn?: string;
  body: string;
}

const SLUG = '2026-10-08-relance-alice';
const DRAFT_PATH = /^\/api\/drafts\/([a-z0-9-]+)$/;
const statusBodySchema = z.object({ status: z.string() });

function serveDrafts(drafts: StoredDraft[]): FetchStub {
  return stubFetch(async (request) => {
    const path = new URL(request.url).pathname;
    if (path === '/api/drafts') return jsonResponse({ items: drafts });
    const draft = drafts.find((candidate) => candidate.slug === DRAFT_PATH.exec(path)?.[1]);
    if (draft === undefined) return jsonResponse({ error: 'Brouillon introuvable.' }, 404);
    draft.status = statusBodySchema.parse(await request.json()).status;
    return jsonResponse(draft);
  });
}

function findButton(tree: MountedTree, text: string): HTMLButtonElement | undefined {
  return [...tree.container.querySelectorAll('button')].find(
    (button) => button.textContent === text,
  );
}

function mountDraft(): MountedTree {
  return mountWithClient(
    createIsolatedQueryClient(),
    <MemoryRouter initialEntries={[`/drafts/${SLUG}`]}>
      <Routes>
        <Route path="/drafts" element={<DraftBoard />} />
        <Route path="/drafts/:slug" element={<DraftView slug={SLUG} />} />
      </Routes>
      <ToastViewport />
    </MemoryRouter>,
  );
}

describe('settling a draft', () => {
  let fetchStub: FetchStub | null = null;

  afterEach(() => {
    act(() => {
      dismissToast();
    });
    fetchStub?.restore();
  });

  it('marks a draft sent, goes back to the list, and puts it back from the toast', async () => {
    fetchStub = serveDrafts([
      {
        slug: SLUG,
        channel: 'gmail',
        recipients: [{ name: 'Alice Martin', page: 'second-brain/personnes/alice-martin' }],
        subject: 'Un café ?',
        status: 'pret',
        createdOn: '2026-10-08',
        body: 'Bonjour Alice,\n\nUn café ?',
      },
    ]);
    const tree = mountDraft();
    await flushUntil(() => findButton(tree, 'Envoyé') !== undefined);
    expect(tree.container.textContent).toContain('Bonjour Alice,');
    act(() => {
      findButton(tree, 'Envoyé')?.click();
    });
    await flushUntil(() => findButton(tree, 'Annuler') !== undefined);
    expect(tree.container.textContent).toContain('Historique (1)');
    act(() => {
      findButton(tree, 'Annuler')?.click();
    });
    await flushUntil(() => tree.container.textContent.includes('Rétabli'));
    expect(tree.container.textContent).not.toContain('Historique');
    const writes = fetchStub.calls.filter((request) => request.method === 'PATCH');
    expect(writes).toHaveLength(2);
    tree.unmount();
  });

  it('shows a faint icon for a draft that does not exist', async () => {
    fetchStub = serveDrafts([]);
    const tree = mountDraft();
    await flushUntil(() => tree.container.querySelector('[role="status"]') !== null);
    expect(findButton(tree, 'Copier')).toBeUndefined();
    tree.unmount();
  });
});
