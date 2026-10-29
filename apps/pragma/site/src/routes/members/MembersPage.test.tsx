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
import { MembersPage } from './MembersPage';

const MEMBERS = [
  { id: 'member-ada', firstName: 'Ada', color: '#c0392b' },
  { id: 'member-bo', firstName: 'Bo', color: '#2f8f6b' },
  { id: 'member-cy', firstName: 'Cy', color: '#3a6ee0' },
];

function answerApi(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (pathname === '/api/members') return jsonResponse({ members: MEMBERS });
  if (pathname.endsWith('/instruments') && pathname.startsWith('/api/members/')) {
    return jsonResponse({ instruments: [] });
  }
  if (pathname === '/api/instruments') return jsonResponse({ instruments: [] });
  if (pathname.startsWith('/api/mastery')) return jsonResponse({ cells: [], mastery: [] });
  return new Response(null, { status: 404 });
}

function renderMembersPage(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={['/members']}>
        <MembersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('the members page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stubSheetDialog();
    stub = stubFetch((request) => Promise.resolve(answerApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('opens on the member list alone, with Members and Mastery tabs in its fixed header', async () => {
    renderMembersPage();
    expect(await screen.findByRole('button', { name: /Ada/ })).toBeTruthy();
    const header = screen.getByRole('heading', { level: 1, name: 'Members' }).closest('header');
    if (header === null) throw new Error('no page header');
    expect(header.classList.contains('sticky')).toBe(true);
    expect(within(header).getByRole('link', { name: 'Band' }).getAttribute('href')).toBe('/band');
    expect(
      within(header)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['Members', 'Mastery']);
    expect(screen.queryByLabelText('First name')).toBeNull();
    expect(screen.queryByText('Mastery matrix')).toBeNull();
  });

  it('opens an empty sheet from New member', async () => {
    renderMembersPage();
    fireEvent.click(await screen.findByRole('button', { name: 'New member' }));
    const sheet = screen.getByRole('dialog', { name: 'New member' });
    expect(within(sheet).getByLabelText('First name')).toHaveProperty('value', '');
  });

  it('opens the same sheet filled in when a member is tapped', async () => {
    renderMembersPage();
    fireEvent.click(await screen.findByRole('button', { name: /Bo/ }));
    const sheet = screen.getByRole('dialog', { name: 'Edit member' });
    expect(within(sheet).getByLabelText('First name')).toHaveProperty('value', 'Bo');
  });

  it('shows the mastery matrix alone on its tab, with no New member action', async () => {
    renderMembersPage();
    fireEvent.click(await screen.findByRole('tab', { name: 'Mastery' }));
    expect(await screen.findByText('Mastery matrix')).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Members' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'New member' })).toBeNull();
  });
});
