import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { stubSheetDialog } from '../../components/molecules/sheet.test-utils';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { ImprovementsPage } from './ImprovementsPage';

const DARK_MODE = {
  id: 'improvement-dark',
  title: 'Dark mode on stage',
  details: '',
  status: 'idea',
  voteCount: 2,
  votedByViewer: false,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

function answerApi(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (pathname === '/api/improvements' && request.method === 'POST') {
    return jsonResponse({ improvement: { ...DARK_MODE, id: 'improvement-new' } }, 201);
  }
  if (pathname === '/api/improvements') return jsonResponse({ improvements: [DARK_MODE] });
  return new Response(null, { status: 404 });
}

function renderImprovementsPage(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={['/improvements']}>
        <ImprovementsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('the improvements page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stubSheetDialog();
    stub = stubFetch((request) => Promise.resolve(answerApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('holds the list and one New improvement action, with no form below the list', async () => {
    renderImprovementsPage();
    expect(await screen.findByText('Dark mode on stage')).toBeTruthy();
    expect(screen.queryByLabelText('Title')).toBeNull();
    const add = screen.getByRole('button', { name: 'New improvement' });
    expect(add.dataset.variant).toBe('primary');
    const header = screen
      .getByRole('heading', { level: 1, name: 'Improvements' })
      .closest('header');
    expect(header?.classList.contains('sticky')).toBe(true);
    expect(header?.querySelector('a')?.getAttribute('href')).toBe('/band');
  });

  it('adds an improvement from the sheet that New improvement opens', async () => {
    renderImprovementsPage();
    fireEvent.click(await screen.findByRole('button', { name: 'New improvement' }));
    const sheet = screen.getByRole('dialog', { name: 'New improvement' });
    fireEvent.change(within(sheet).getByLabelText('Title'), { target: { value: ' Setlist PDF ' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const creation = stub?.calls.find((request) => request.method === 'POST');
    expect(await creation?.clone().json()).toMatchObject({ title: 'Setlist PDF', status: 'idea' });
  });

  it('opens the same sheet filled in when an improvement is tapped', async () => {
    renderImprovementsPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Dark mode on stage' }));
    const sheet = screen.getByRole('dialog', { name: 'Edit improvement' });
    expect(within(sheet).getByLabelText('Title')).toHaveProperty('value', 'Dark mode on stage');
  });
});
