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
import { InstrumentsPage } from './InstrumentsPage';

const BASS = {
  id: 'instrument-bass',
  name: 'Bass',
  family: 'harmonic',
  icon: 'bass',
  isHarmonic: true,
  players: [
    { memberId: 'member-ada', isPrimary: true },
    { memberId: 'member-bo', isPrimary: false },
    { memberId: 'member-cy', isPrimary: false },
    { memberId: 'member-di', isPrimary: false },
  ],
};
const ADA = { id: 'member-ada', firstName: 'Ada', color: '#c0392b' };
const OTHER_PLAYERS = [
  { id: 'member-bo', firstName: 'Bo', color: '#2f8f6b' },
  { id: 'member-cy', firstName: 'Cy', color: '#3a6ee0' },
  { id: 'member-di', firstName: 'Di', color: '#b8841a' },
];

function answerInstrumentsApi(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (pathname === '/api/instruments' && request.method === 'POST') {
    return jsonResponse({ instrument: { ...BASS, id: 'instrument-new', name: 'Cello' } }, 201);
  }
  if (pathname === '/api/instruments') return jsonResponse({ instruments: [BASS] });
  if (pathname === '/api/members') return jsonResponse({ members: [ADA, ...OTHER_PLAYERS] });
  return new Response(null, { status: 404 });
}

function renderInstrumentsPage(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={['/instruments']}>
        <InstrumentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('the instruments page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stubSheetDialog();
    stub = stubFetch((request) => Promise.resolve(answerInstrumentsApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('holds no form on the page, only the list and one Add an instrument action', async () => {
    renderInstrumentsPage();
    expect(await screen.findByText('Bass')).toBeTruthy();
    expect(screen.queryByLabelText('Name')).toBeNull();
    const addInstrument = screen.getByRole('button', { name: 'Add an instrument' });
    expect(addInstrument.dataset.variant).toBe('primary');
    expect(addInstrument.querySelector('svg')).not.toBeNull();
  });

  it('adds an instrument from the sheet that Add an instrument opens', async () => {
    renderInstrumentsPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add an instrument' }));
    const sheet = screen.getByRole('dialog', { name: 'New instrument' });
    fireEvent.change(within(sheet).getByLabelText('Name'), { target: { value: '  Cello ' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const creation = stub?.calls.find((request) => request.method === 'POST');
    expect(await creation?.clone().json()).toMatchObject({ name: 'Cello', family: 'harmonic' });
  });

  it('names every player of an instrument and marks the main instrument in words', async () => {
    renderInstrumentsPage();
    expect(await screen.findByText(/Each instrument lists the members who play it/)).toBeTruthy();
    const row = (await screen.findByText('Bass')).closest('li');
    if (row === null) throw new Error('no instrument row');
    const players = within(row).getAllByRole('button', { name: /^Main instrument — / });
    expect(players.map((player) => player.textContent)).toEqual(['AAdamain', 'BBo', 'CCy', 'DDi']);
    expect(players[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(within(row).getByText('Played by')).toBeTruthy();
  });

  it('links back to Band from its fixed header', async () => {
    renderInstrumentsPage();
    const header = (await screen.findByRole('heading', { level: 1, name: 'Instruments' })).closest(
      'header',
    );
    expect(header?.classList.contains('sticky')).toBe(true);
    expect(
      within(header ?? document.body)
        .getByRole('link', { name: 'Band' })
        .getAttribute('href'),
    ).toBe('/band');
  });

  it('opens the same sheet filled in when an instrument is tapped', async () => {
    renderInstrumentsPage();
    fireEvent.click(await screen.findByRole('button', { name: /^Bass/ }));
    const sheet = screen.getByRole('dialog', { name: 'Edit instrument' });
    expect(within(sheet).getByLabelText('Name')).toHaveProperty('value', 'Bass');
  });
});
