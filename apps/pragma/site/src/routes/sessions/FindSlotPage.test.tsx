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
import { BAND_CALENDAR_ID, bandCalendarSubscribeAddress } from '../../lib/band-calendar.utils';
import { FindSlotPage } from './FindSlotPage';
import { SessionsPage } from './SessionsPage';

const SLOTS = [
  { start: '2026-11-03T18:00:00.000Z', end: '2026-11-03T20:00:00.000Z' },
  { start: '2026-11-05T18:00:00.000Z', end: '2026-11-05T20:00:00.000Z' },
  { start: '2026-11-10T18:00:00.000Z', end: '2026-11-10T20:00:00.000Z' },
];
const MEMBERS = [
  { id: 'member-ada', firstName: 'Ada', color: '#c0392b' },
  { id: 'member-bo', firstName: 'Bo', color: '#2f8f6b' },
];

function answerApi(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (pathname === '/api/free-slots') {
    return jsonResponse({
      slots: SLOTS,
      excludedMembers: [{ memberId: 'member-bo', reason: 'no-calendar', calendarName: null }],
    });
  }
  if (pathname === '/api/members') return jsonResponse({ members: MEMBERS });
  if (pathname === '/api/sessions') return jsonResponse({ sessions: [] });
  return new Response(null, { status: 404 });
}

function renderAt(page: JSX.Element, path: string): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('finding a slot', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stubSheetDialog();
    stub = stubFetch((request) => Promise.resolve(answerApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('is reached from one Find a slot link on Sessions, which no longer lists free slots', async () => {
    renderAt(<SessionsPage />, '/sessions');
    const link = await screen.findByRole('link', { name: 'Find a slot' });
    expect(link.getAttribute('href')).toBe('/sessions/slots');
    expect(link.closest('header')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /^Book a practice/ })).toBeNull();
    expect(stub?.calls.some((request) => request.url.includes('/api/free-slots'))).toBe(false);
  });

  it('lists the free slots under a fixed header, the members left out above them', async () => {
    renderAt(<FindSlotPage />, '/sessions/slots');
    const header = screen.getByRole('heading', { level: 1, name: 'Find a slot' }).closest('header');
    if (header === null) throw new Error('no page header');
    expect(header.classList.contains('sticky')).toBe(true);
    expect(within(header).getByRole('link', { name: 'Sessions' }).getAttribute('href')).toBe(
      '/sessions',
    );
    const slots = await screen.findByRole('list', { name: 'Next free slots' });
    expect(within(slots).getAllByRole('listitem')).toHaveLength(SLOTS.length);
    const exclusion = screen.getByText('Without Bo, who has no calendar');
    expect(
      exclusion.compareDocumentPosition(slots) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('offers a secondary subscription to the band calendar in its header', () => {
    renderAt(<FindSlotPage />, '/sessions/slots');
    const header = screen.getByRole('heading', { level: 1, name: 'Find a slot' }).closest('header');
    if (header === null) throw new Error('no page header');
    const subscribe = within(header).getByRole('link', { name: 'Subscribe to the band calendar' });
    expect(subscribe.getAttribute('href')).toBe(bandCalendarSubscribeAddress(BAND_CALENDAR_ID));
    expect(subscribe.getAttribute('data-variant')).toBe('secondary');
  });

  it('books a practice on a slot from the new session sheet', async () => {
    renderAt(<FindSlotPage />, '/sessions/slots');
    const slots = await screen.findByRole('list', { name: 'Next free slots' });
    const [firstBooking] = within(slots).getAllByRole('button', { name: /^Book a practice/ });
    if (firstBooking === undefined) throw new Error('no slot to book');
    fireEvent.click(firstBooking);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
