import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
import { HomePage } from './HomePage';

const DAY_MS = 86_400_000;
const MEMBER = { id: 'member-1', firstName: 'Ada', color: '#c0392b' };
const GUITAR = { id: 'guitar-1', name: 'Guitar', icon: 'guitar', family: 'harmonic', position: 0 };
const NEXT_PRACTICE = {
  id: 'session-next',
  kind: 'practice',
  date: new Date(Date.now() + 3 * DAY_MS).toISOString(),
  venue: 'Studio Bleu',
};
const PRACTICE_TODAY = {
  id: 'session-next',
  kind: 'practice',
  date: new Date().toISOString(),
  venue: null,
};
const LATER_CONCERT = {
  id: 'session-later',
  kind: 'concert',
  date: new Date(Date.now() + 10 * DAY_MS).toISOString(),
  venue: 'Le Petit Bain',
};
const PAST_PRACTICE = {
  id: 'session-past',
  kind: 'practice',
  date: new Date(Date.now() - 3 * DAY_MS).toISOString(),
  venue: null,
};
const SETLIST = {
  id: 'setlist-1',
  name: 'Wednesday',
  status: 'locked',
  songCount: 2,
  sessionIds: [],
};
const SONGS = [
  {
    id: 'song-a',
    title: 'Superstition',
    artist: '',
    defaultLineup: { [MEMBER.id]: [GUITAR.id] },
    durationSeconds: 1800,
  },
  { id: 'song-b', title: 'Valerie', artist: '', defaultLineup: {}, durationSeconds: 1080 },
];
const ENTRIES = [
  { id: 'entry-a', songId: 'song-a', position: 0, lineupOverride: null },
  { id: 'entry-b', songId: 'song-b', position: 1, lineupOverride: null },
];
const MY_TASK = {
  id: 'task-1',
  title: 'Send the setlist to the sound engineer',
  notes: '',
  status: 'todo',
  assigneeId: MEMBER.id,
  songId: null,
  dueDate: null,
};
const SIGNED_IN = {
  memberId: MEMBER.id,
  firstName: MEMBER.firstName,
  color: MEMBER.color,
  username: 'ada',
  phone: null,
  email: null,
  calendarFeed: { isConnected: false },
};

function answerHomeApi(sessions: readonly unknown[]) {
  return (request: Request): Response => {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/sessions') return jsonResponse({ sessions });
    if (pathname.startsWith('/api/setlists/by-session/session-next')) {
      return jsonResponse({ setlists: [SETLIST] });
    }
    if (pathname === `/api/setlists/${SETLIST.id}/entries`)
      return jsonResponse({ entries: ENTRIES });
    if (pathname === '/api/songs') return jsonResponse({ songs: SONGS });
    if (pathname === '/api/instruments') return jsonResponse({ instruments: [GUITAR] });
    if (pathname === '/api/members') return jsonResponse({ members: [MEMBER] });
    if (pathname === '/api/tasks') return jsonResponse({ tasks: [MY_TASK] });
    if (pathname === '/api/me') return jsonResponse(SIGNED_IN);
    return new Response(null, { status: 404 });
  };
}

function renderHomePage(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('the home page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stubSheetDialog();
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('shows the next session with its place, setlist, song count and total time', async () => {
    const answer = answerHomeApi([LATER_CONCERT, NEXT_PRACTICE, PAST_PRACTICE]);
    stub = stubFetch((request) => Promise.resolve(answer(request)));
    renderHomePage();
    const card = await screen.findByRole('region', { name: 'Next session' });
    expect(within(card).getByText('Practice')).toBeTruthy();
    expect(within(card).getByText(NEXT_PRACTICE.venue)).toBeTruthy();
    expect(await within(card).findByText(SETLIST.name)).toBeTruthy();
    expect(await within(card).findByText('2 songs · 48 min')).toBeTruthy();
  });

  it('names the next concert on the card when the next session is a practice', async () => {
    const answer = answerHomeApi([LATER_CONCERT, NEXT_PRACTICE]);
    stub = stubFetch((request) => Promise.resolve(answer(request)));
    renderHomePage();
    const card = await screen.findByRole('region', { name: 'Next session' });
    const concertLink = within(card).getByRole('link', { name: /Next concert/ });
    expect(concertLink.getAttribute('href')).toBe(`/sessions/${LATER_CONCERT.id}`);
    expect(within(concertLink).getByText(new RegExp(LATER_CONCERT.venue))).toBeTruthy();
  });

  it('does not repeat the concert when the next session is that concert', async () => {
    const answer = answerHomeApi([LATER_CONCERT]);
    stub = stubFetch((request) => Promise.resolve(answer(request)));
    renderHomePage();
    const card = await screen.findByRole('region', { name: 'Next session' });
    expect(within(card).queryByRole('link', { name: /Next concert/ })).toBe(null);
  });

  it('offers Open the setlist as its one primary action', async () => {
    const answer = answerHomeApi([NEXT_PRACTICE]);
    stub = stubFetch((request) => Promise.resolve(answer(request)));
    renderHomePage();
    const link = await screen.findByRole('link', { name: 'Open the setlist' });
    expect(link.getAttribute('href')).toBe(`/setlists/${SETLIST.id}`);
    expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(1);
  });

  it('offers Start the practice on the practice day, as its one primary action', async () => {
    const answer = answerHomeApi([PRACTICE_TODAY]);
    stub = stubFetch((request) => Promise.resolve(answer(request)));
    renderHomePage();
    const link = await screen.findByRole('link', { name: 'Start the practice' });
    expect(link.getAttribute('href')).toBe(`/sessions/${PRACTICE_TODAY.id}/practice`);
    expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(1);
  });

  it('lists the songs the member plays and their open tasks', async () => {
    const answer = answerHomeApi([NEXT_PRACTICE]);
    stub = stubFetch((request) => Promise.resolve(answer(request)));
    renderHomePage();
    const part = await screen.findByRole('list', { name: 'Your part' });
    expect(within(part).getByText('Superstition')).toBeTruthy();
    expect(within(part).queryByText('Valerie')).toBe(null);
    expect(screen.queryByRole('list', { name: 'Your tasks' })).toBe(null);
    fireEvent.click(screen.getByRole('tab', { name: 'Your tasks' }));
    const tasks = await screen.findByRole('list', { name: 'Your tasks' });
    expect(screen.queryByRole('list', { name: 'Your part' })).toBe(null);
    expect(within(tasks).getByText(MY_TASK.title)).toBeTruthy();
  });

  it('opens a task in the task sheet', async () => {
    const answer = answerHomeApi([NEXT_PRACTICE]);
    stub = stubFetch((request) => Promise.resolve(answer(request)));
    renderHomePage();
    fireEvent.click(await screen.findByRole('tab', { name: 'Your tasks' }));
    fireEvent.click(await screen.findByRole('button', { name: MY_TASK.title }));
    const sheet = screen.getByRole('dialog', { name: 'Edit task' });
    expect(within(sheet).getByLabelText('Title')).toHaveProperty('value', MY_TASK.title);
  });

  it('shows an empty state with New session when no session is ahead', async () => {
    const answer = answerHomeApi([PAST_PRACTICE]);
    stub = stubFetch((request) => Promise.resolve(answer(request)));
    renderHomePage();
    fireEvent.click(await screen.findByRole('button', { name: 'New session' }));
    expect(screen.getByRole('dialog', { name: 'New practice' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Next session' })).toBe(null);
  });
});
