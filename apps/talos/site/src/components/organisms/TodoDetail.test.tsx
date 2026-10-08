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
import { TodoDetail } from './TodoDetail';
import { ToastViewport } from './ToastViewport';

const TODO_ID = '4e6590b574';
const TODO = {
  id: TODO_ID,
  text: 'Envoyer le devis',
  done: false,
  dueDate: '2026-10-09',
  commitment: 'engagements/devis-acme',
  source: 'sources/2026/10/02/appel-acme.md',
  addedOn: '2026-10-04',
};
const TODO_LINE = '- [ ] Envoyer le devis | ajouté: 2026-10-04';
const restorationSchema = z.object({ line: z.string(), position: z.number() });

function page(path: string, markdown: string, frontMatter: Record<string, string> = {}) {
  return {
    path,
    title: path,
    type: 'page',
    frontMatter,
    markdown,
    outgoingLinks: [],
    incomingLinks: [],
  };
}

function serveTodo(restorations: unknown[]): FetchStub {
  return stubFetch(async (request) => {
    const path = new URL(request.url).pathname;
    if (path === '/api/todos') return jsonResponse({ items: [TODO] });
    if (path === `/api/todos/${TODO_ID}` && request.method === 'DELETE') {
      return jsonResponse({ todo: TODO, line: TODO_LINE, position: 0 });
    }
    if (path === '/api/todos/restorations') {
      restorations.push(restorationSchema.parse(await request.json()));
      return jsonResponse(TODO, 201);
    }
    if (path === '/api/pages/sources/2026/10/02/appel-acme') {
      return jsonResponse(page('sources/2026/10/02/appel-acme', 'Acme attend le devis.'));
    }
    if (path === '/api/pages/engagements/devis-acme') {
      return jsonResponse(
        page('engagements/devis-acme', '# Le devis Acme', {
          sources: '["gmail 1a0f81ddd8619d54", "https://exemple.fr/fil"]',
        }),
      );
    }
    return jsonResponse({ error: 'Page introuvable.' }, 404);
  });
}

function mountDetail(): MountedTree {
  return mountWithClient(
    createIsolatedQueryClient(),
    <MemoryRouter initialEntries={['/todos', `/todos/${TODO_ID}`]} initialIndex={1}>
      <Routes>
        <Route path="/todos" element={<p>liste</p>} />
        <Route path="/todos/:id" element={<TodoDetail id={TODO_ID} />} />
      </Routes>
      <ToastViewport />
    </MemoryRouter>,
  );
}

function findButton(tree: MountedTree, text: string): HTMLButtonElement | undefined {
  return [...tree.container.querySelectorAll('button')].find((button) =>
    button.textContent.includes(text),
  );
}

describe('the detail of a todo', () => {
  let stub: FetchStub | undefined;
  let tree: MountedTree | undefined;

  afterEach(() => {
    tree?.unmount();
    stub?.restore();
    dismissToast();
  });

  it('shows the source it came from, its commitment and the commitment sources', async () => {
    stub = serveTodo([]);
    tree = mountDetail();
    const mounted = tree;
    await flushUntil(() => mounted.container.textContent.includes('Acme attend le devis.'));
    await flushUntil(() => mounted.container.textContent.includes('Le devis Acme'));
    expect(mounted.container.querySelector('h1')?.textContent).toBe('Envoyer le devis');
    expect(mounted.container.textContent).toContain('gmail 1a0f81ddd8619d54');
    expect(mounted.container.querySelector('a[href="https://exemple.fr/fil"]')).not.toBeNull();
  });

  it('deletes the todo, goes back, and restores it in place from the toast', async () => {
    const restorations: unknown[] = [];
    stub = serveTodo(restorations);
    tree = mountDetail();
    const mounted = tree;
    await flushUntil(() => findButton(mounted, 'Supprimer') !== undefined);
    act(() => {
      findButton(mounted, 'Supprimer')?.click();
    });
    await flushUntil(() => findButton(mounted, 'Annuler') !== undefined);
    expect(mounted.container.textContent).toContain('liste');
    expect(mounted.container.textContent).toContain('Supprimée');
    act(() => {
      findButton(mounted, 'Annuler')?.click();
    });
    await flushUntil(() => restorations.length === 1);
    expect(restorations).toEqual([{ line: TODO_LINE, position: 0 }]);
  });
});
