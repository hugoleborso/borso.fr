import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
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

  it('carries the bar form Save as its one primary action', async () => {
    renderBarsPage();
    await screen.findByRole('button', { name: 'Save the message' });
    const primaries = document.querySelectorAll('[data-variant="primary"]');
    expect(primaries).toHaveLength(ONE_PRIMARY);
    expect(primaries[0]?.textContent).toBe('Save');
  });
});
