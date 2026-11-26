import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { SessionGearPage } from './SessionGearPage';

const CONCERT_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const EARLIER_CONCERT_ID = 'bbbbbbbb-2222-4222-8222-222222222222';
const BORSO = { id: 'cccccccc-3333-4333-8333-333333333333', firstName: 'Borso', color: '#2d5fa0' };
const COSYN = { id: 'dddddddd-4444-4444-8444-444444444444', firstName: 'Cosyn', color: '#fa8072' };

const CONCERT = {
  id: CONCERT_ID,
  kind: 'concert',
  date: '2026-12-17T19:00:00.000Z',
  venue: 'Punk Paradise',
  capacity: null,
  friendsCountPerMember: {},
  preparedConcertId: null,
};

interface GearItemShape {
  readonly id: string;
  readonly sessionId: string;
  readonly label: string;
  readonly status: 'to_find' | 'asked_of_venue' | 'have';
  readonly memberId: string | null;
  readonly position: number;
}

function gearItem(
  position: number,
  label: string,
  status: GearItemShape['status'],
  memberId: string | null = null,
): GearItemShape {
  return {
    id: `0000000${String(position)}-7777-4777-8777-777777777777`,
    sessionId: CONCERT_ID,
    label,
    status,
    memberId,
    position,
  };
}

const MULTIPRISE = gearItem(0, 'Multiprise', 'to_find');
const SONO = gearItem(1, 'Sono', 'asked_of_venue');
const AMPLI = gearItem(2, 'Ampli basse', 'have', BORSO.id);
const PEDALES = gearItem(3, 'Pédales', 'have', COSYN.id);

interface RecordedWrite {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

interface GearApi {
  readonly items: readonly GearItemShape[];
  readonly copySource: object | null;
  readonly gearStatus?: number;
  readonly writeStatus?: number;
}

const activeStubs: FetchStub[] = [];

function readChanges(body: unknown): object {
  return typeof body === 'object' && body !== null ? body : {};
}

function stubGearApi(api: GearApi): RecordedWrite[] {
  const writes: RecordedWrite[] = [];
  const stub = stubFetch(async (request) => {
    const path = new URL(request.url).pathname;
    if (request.method !== 'GET') {
      const body: unknown = request.method === 'DELETE' ? null : await request.clone().json();
      writes.push({ method: request.method, path, body });
      if (api.writeStatus !== undefined) return jsonResponse({ error: 'boom' }, api.writeStatus);
      if (path.endsWith('/copy')) return jsonResponse({ items: [MULTIPRISE] }, 201);
      return jsonResponse({ item: { ...MULTIPRISE, ...readChanges(body) } }, 201);
    }
    if (path === `/api/sessions/${CONCERT_ID}`) return jsonResponse({ session: CONCERT });
    if (path === `/api/gear-items/${CONCERT_ID}`) {
      return api.gearStatus === undefined
        ? jsonResponse({ items: api.items, copySource: api.copySource })
        : jsonResponse({ error: 'not-a-concert' }, api.gearStatus);
    }
    if (path === '/api/members') return jsonResponse({ members: [BORSO, COSYN] });
    if (path === '/api/me') return jsonResponse({ memberId: BORSO.id, firstName: BORSO.firstName });
    return jsonResponse({ sessions: [CONCERT] });
  });
  activeStubs.push(stub);
  return writes;
}

function renderGearPage(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={[`/sessions/${CONCERT_ID}/gear`]}>
        <Routes>
          <Route path="/sessions/:sessionId/gear" element={<SessionGearPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function sectionTitled(title: string): HTMLElement {
  const section = screen.getByRole('heading', { name: new RegExp(`^${title}`) }).closest('section');
  if (section === null) throw new Error(`no section ${title}`);
  return section;
}

// @FollowsBlueprint test-component-render
describe('the gear page of a concert', () => {
  afterEach(() => {
    cleanup();
    for (const stub of activeStubs.splice(0)) stub.restore();
  });

  it('lists the gear in sections to find, asked of the venue, then had, with counted chips', async () => {
    stubGearApi({ items: [PEDALES, AMPLI, SONO, MULTIPRISE], copySource: null });
    renderGearPage();
    await screen.findByText('Multiprise');
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['To find1', 'Asked of the venue1', 'I have it2']);
    expect(
      within(sectionTitled('I have it'))
        .getAllByRole('button')
        .map((row) => row.textContent),
    ).toEqual(['B', 'Ampli basse', 'C', 'Pédales']);
    expect(screen.getByRole('button', { name: 'All' }).textContent).toBe('All4');
    expect(screen.getByRole('button', { name: 'To find' }).textContent).toBe('1');
  });

  it('keeps one section under its chip, and only what I have under Moi', async () => {
    stubGearApi({ items: [PEDALES, AMPLI, SONO, MULTIPRISE], copySource: null });
    renderGearPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Asked of the venue' }));
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Asked of the venue1']);
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Only what I have' }));
    expect(screen.getByText('Ampli basse')).toBeTruthy();
    expect(screen.queryByText('Pédales')).toBeNull();
    expect(screen.queryByText('Sono')).toBeNull();
    expect(screen.getByRole('button', { name: 'All' }).textContent).toBe('All1');
  });

  it('moves an item to the venue at a tap on its mark, before the server answers', async () => {
    const writes = stubGearApi({ items: [MULTIPRISE], copySource: null });
    renderGearPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Change who has Multiprise' }));
    expect(await screen.findByRole('heading', { name: /^Asked of the venue/ })).toBeTruthy();
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toStrictEqual({
      method: 'PUT',
      path: `/api/gear-items/${CONCERT_ID}/${MULTIPRISE.id}`,
      body: { status: 'asked_of_venue', memberId: null },
    });
  });

  it('puts the item back and says so when the change fails', async () => {
    stubGearApi({ items: [MULTIPRISE], copySource: null, writeStatus: 500 });
    renderGearPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Change who has Multiprise' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^To find/ })).toBeTruthy();
  });

  it('offers to reuse the latest earlier concert on an empty list, and copies it', async () => {
    const writes = stubGearApi({
      items: [],
      copySource: {
        sessionId: EARLIER_CONCERT_ID,
        venue: 'Akanaboum',
        date: '2026-10-01T19:00:00.000Z',
        itemCount: 11,
      },
    });
    renderGearPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Reuse Akanaboum · 11' }));
    expect(await screen.findByText('Multiprise')).toBeTruthy();
    expect(writes).toStrictEqual([
      {
        method: 'POST',
        path: `/api/gear-items/${CONCERT_ID}/copy`,
        body: { fromSessionId: EARLIER_CONCERT_ID },
      },
    ]);
  });

  it('offers no reuse when no earlier concert holds gear', async () => {
    stubGearApi({ items: [], copySource: null });
    renderGearPage();
    expect(await screen.findByText('No gear listed for this concert yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Reuse/ })).toBeNull();
  });

  it('adds an item held by nobody yet from the sheet', async () => {
    const writes = stubGearApi({ items: [], copySource: null });
    renderGearPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add an item' }));
    const sheet = await screen.findByRole('dialog', { name: 'Add an item' });
    fireEvent.change(within(sheet).getByLabelText('Item'), { target: { value: ' Multiprise ' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(writes[0]).toMatchObject({
      method: 'POST',
      path: `/api/gear-items/${CONCERT_ID}`,
      body: { label: 'Multiprise', status: 'to_find', memberId: null },
    });
  });

  it('keeps the sheet and its text open when the item cannot be saved', async () => {
    stubGearApi({ items: [], copySource: null, writeStatus: 400 });
    renderGearPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add an item' }));
    const sheet = await screen.findByRole('dialog', { name: 'Add an item' });
    fireEvent.change(within(sheet).getByLabelText('Item'), { target: { value: 'Multiprise' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Add' }));
    expect(await within(sheet).findByText('The item could not be saved. Try again.')).toBeTruthy();
    expect(within(sheet).getByLabelText('Item')).toHaveProperty('value', 'Multiprise');
  });

  it('edits and deletes an item from a tap on its label', async () => {
    const writes = stubGearApi({ items: [AMPLI], copySource: null });
    renderGearPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Ampli basse' }));
    const sheet = await screen.findByRole('dialog', { name: 'Edit the item' });
    expect(within(sheet).getByRole('radio', { name: 'Borso has it' })).toHaveProperty(
      'checked',
      true,
    );
    fireEvent.click(within(sheet).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText('Ampli basse')).toBeNull());
    expect(writes).toStrictEqual([
      { method: 'DELETE', path: `/api/gear-items/${CONCERT_ID}/${AMPLI.id}`, body: null },
    ]);
  });

  it('shows the missing session notice for a practice, which holds no gear', async () => {
    stubGearApi({ items: [], copySource: null, gearStatus: 404 });
    renderGearPage();
    expect(await screen.findByText('This session is no longer in the schedule.')).toBeTruthy();
  });
});
