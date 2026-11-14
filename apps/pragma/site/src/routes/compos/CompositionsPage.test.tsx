import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { CompositionsPage } from './CompositionsPage';

const CATALOGUED = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Avignon Nice',
  songId: '22222222-2222-4222-8222-222222222222',
  createdAt: '2026-11-13T10:00:00.000Z',
};
const SKETCHING = {
  id: '33333333-3333-4333-8333-333333333333',
  title: 'Composition 4',
  songId: null,
  createdAt: '2026-11-12T10:00:00.000Z',
};

async function answerApi(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === '/api/compositions' && request.method === 'POST') {
    const body: unknown = await request.clone().json();
    const created = typeof body === 'object' && body !== null ? body : {};
    return jsonResponse(
      { composition: { ...created, songId: null, createdAt: '2026-11-13T11:00:00.000Z' } },
      201,
    );
  }
  if (pathname === '/api/compositions') {
    return jsonResponse({ compositions: [CATALOGUED, SKETCHING] });
  }
  return new Response(null, { status: 404 });
}

function renderCompositionsPage(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={['/compos']}>
        <Routes>
          <Route path="/compos" element={<CompositionsPage />} />
          <Route path="/compos/:compositionId/sketch" element={<p>sketch opened</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('the compositions page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stub = stubFetch(answerApi);
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('lists each composition with a link to its sketch, and badges the one in the catalogue', async () => {
    renderCompositionsPage();
    const list = await screen.findByRole('list', { name: 'Compositions' });
    const catalogued = await within(list).findByRole('link', { name: /Avignon Nice/ });
    const sketching = within(list).getByRole('link', { name: /Composition 4/ });

    expect(catalogued.getAttribute('href')).toBe(`/compos/${CATALOGUED.id}/sketch`);
    expect(within(catalogued).getByText('In the catalogue')).toBeTruthy();
    expect(within(sketching).queryByText('In the catalogue')).toBeNull();
  });

  it('prefills one past the highest composition number, creates it with that title and opens its sketch', async () => {
    renderCompositionsPage();
    await screen.findByRole('link', { name: /Avignon Nice/ });

    fireEvent.click(screen.getByRole('button', { name: 'New composition' }));
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveProperty('value', 'Composition 5');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('sketch opened')).toBeTruthy();
    const creation = stub?.calls.find((call) => call.method === 'POST');
    expect(await creation?.json()).toEqual({ id: expect.any(String), title: 'Composition 5' });
  });
});
