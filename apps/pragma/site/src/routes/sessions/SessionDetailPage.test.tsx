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
import { stubSheetDialog } from '../../components/molecules/sheet.test-utils';
import { SessionDetailPage } from './SessionDetailPage';

const CONCERT = {
  id: 'aaaaaaaa-1111-4111-8111-111111111111',
  kind: 'concert',
  date: '2026-11-01T19:00:00.000Z',
  venue: 'Le Petit Bain',
  capacity: null,
  gear: null,
  friendsCountPerMember: {},
  preparedConcertId: null,
};

const SESSION_SETLIST = {
  id: 'cccccccc-3333-4333-8333-333333333333',
  name: 'Main set',
  status: null,
  songCount: 0,
  sessionIds: [CONCERT.id],
};
const OTHER_SETLIST = {
  id: 'dddddddd-4444-4444-8444-444444444444',
  name: 'Encores',
  status: null,
  songCount: 2,
  sessionIds: [],
};

const sessionSetlists: { current: readonly (typeof SESSION_SETLIST)[] } = { current: [] };

function answerSessionApi(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (pathname === `/api/sessions/${CONCERT.id}`) return jsonResponse({ session: CONCERT });
  if (pathname === '/api/sessions') return jsonResponse({ sessions: [CONCERT] });
  if (pathname === '/api/members') return jsonResponse({ members: [] });
  if (pathname === '/api/setlists') {
    return jsonResponse({ setlists: [...sessionSetlists.current, OTHER_SETLIST] });
  }
  if (pathname === '/api/tasks') return jsonResponse({ tasks: [] });
  if (pathname === '/api/songs') return jsonResponse({ songs: [] });
  if (pathname.includes('setlists')) return jsonResponse({ setlists: sessionSetlists.current });
  return new Response(null, { status: 404 });
}

function renderSessionPage(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={[`/sessions/${CONCERT.id}`]}>
        <Routes>
          <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('the concert page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    sessionSetlists.current = [];
    stubSheetDialog();
    stub = stubFetch((request) => Promise.resolve(answerSessionApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('reaches the audience vote through one link and carries no vote block itself', async () => {
    renderSessionPage();
    const audienceLink = await screen.findByRole('link', { name: 'Audience vote' });
    expect(audienceLink.getAttribute('href')).toBe(`/sessions/${CONCERT.id}/audience`);
    expect(audienceLink.dataset.variant).toBe('secondary');
    expect(screen.queryByRole('button', { name: /thirty-second round/ })).toBeNull();
    expect(screen.queryByText(/vote\//)).toBeNull();
  });

  it('offers Add a setlist as the primary action, and attaching one, when the session has none', async () => {
    renderSessionPage();
    expect(await screen.findByText(/No setlist on this session yet/)).toBeTruthy();
    const addSetlist = await screen.findByRole('button', { name: 'Add a setlist' });
    expect(addSetlist.dataset.variant).toBe('primary');
    fireEvent.click(screen.getByRole('button', { name: 'Attach an existing setlist' }));
    const chooser = await screen.findByRole('dialog', { name: 'Attach a setlist' });
    expect(await within(chooser).findByText('Encores')).toBeTruthy();
  });

  it('keeps a visible secondary Add a setlist once the session has one', async () => {
    sessionSetlists.current = [SESSION_SETLIST];
    renderSessionPage();
    const addSetlist = await screen.findByRole('button', { name: 'Add a setlist' });
    expect(addSetlist.dataset.variant).toBe('secondary');
    fireEvent.click(addSetlist);
    const chooser = await screen.findByRole('dialog', { name: 'Add a setlist' });
    expect(within(chooser).getByText('New setlist for this session')).toBeTruthy();
    expect(await within(chooser).findByText('Encores')).toBeTruthy();
    expect(within(chooser).queryByText('Main set')).toBeNull();
  });

  it('shows one part of the session at a time, chosen from tabs in its fixed header', async () => {
    renderSessionPage();
    const header = (
      await screen.findByRole('heading', { level: 1, name: 'Le Petit Bain' })
    ).closest('header');
    if (header === null) throw new Error('no page header');
    expect(header.classList.contains('sticky')).toBe(true);
    expect(within(header).getByRole('link', { name: 'Sessions' }).getAttribute('href')).toBe(
      '/sessions',
    );
    const tabs = within(header).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Setlist', 'Tasks', 'Takes', 'Details']);
    expect(screen.queryByRole('heading', { name: 'Who does what' })).toBeNull();

    fireEvent.click(within(header).getByRole('tab', { name: 'Tasks' }));
    expect(await screen.findByRole('heading', { name: 'Who does what' })).toBeTruthy();
    expect(screen.queryByText(/No setlist on this session yet/)).toBeNull();
  });

  it('opens the details when Edit is tapped', async () => {
    renderSessionPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('tab', { name: 'Details' }).getAttribute('aria-selected')).toBe('true');
  });
});
