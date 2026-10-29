import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { stubSheetDialog } from '../../components/molecules/sheet.test-utils';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { BarsPage } from './BarsPage';

const MEMBER = { id: 'member-1', firstName: 'Ada', color: '#c0392b' };
const SIGNED_IN = {
  memberId: MEMBER.id,
  firstName: MEMBER.firstName,
  color: MEMBER.color,
  username: 'ada',
  phone: null,
  email: null,
  calendarFeed: { isConnected: false },
};
const ONE_PRIMARY = 1;

function renderBarsPage(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={['/bars']}>
        <BarsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function answerBarsApi(request: Request): Response {
  if (request.url.includes('/api/bars')) return jsonResponse({ bars: [] });
  if (request.url.includes('/api/members')) return jsonResponse({ members: [MEMBER] });
  if (request.url.includes('/api/outreach')) return jsonResponse({ body: null });
  if (request.url.includes('/api/me')) return jsonResponse(SIGNED_IN);
  return new Response(null, { status: 404 });
}

// @FollowsBlueprint test-component-render
describe('the bars page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stubSheetDialog();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    stub = stubFetch((request) => Promise.resolve(answerBarsApi(request)));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    stub?.restore();
  });

  it('carries New bar as its one primary action, with no form on the page', async () => {
    renderBarsPage();
    const newBar = await screen.findByRole('button', { name: 'New bar' });
    const primaries = document.querySelectorAll('[data-variant="primary"]');
    expect(primaries).toHaveLength(ONE_PRIMARY);
    expect(primaries[0]).toBe(newBar);
    expect(screen.queryByLabelText('Name')).toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('opens the bar form in a sheet from New bar, with the place search at its top', async () => {
    renderBarsPage();
    fireEvent.click(await screen.findByRole('button', { name: 'New bar' }));
    const sheet = screen.getByRole('dialog', { name: 'New bar' });
    expect(within(sheet).getByRole('searchbox')).toBeTruthy();
    expect(within(sheet).getByRole('button', { name: 'Save' }).dataset.variant).toBe('primary');
  });

  it('opens the outreach message from the header, in a sheet', async () => {
    renderBarsPage();
    const header = screen.getByRole('heading', { level: 1, name: 'Bars' }).closest('header');
    if (header === null) throw new Error('no page header');
    expect(within(header).getByRole('link', { name: 'Band' }).getAttribute('href')).toBe('/band');
    fireEvent.click(within(header).getByRole('button', { name: 'Outreach message' }));
    expect(screen.getByRole('dialog', { name: 'Outreach message' })).toBeTruthy();
  });
});
