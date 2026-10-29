import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { MasteryMatrix } from './MasteryMatrix';

const MEMBERS = [
  { id: 'member-ada', firstName: 'Ada', color: '#c0392b' },
  { id: 'member-bo', firstName: 'Bo', color: '#2d5fa0' },
];
const INSTRUMENTS = [
  { id: 'instrument-bass', name: 'Bass' },
  { id: 'instrument-drums', name: 'Drums' },
];
const DEFAULTS = [
  { memberId: 'member-ada', instrumentId: 'instrument-bass', score: 4 },
  { memberId: 'member-ada', instrumentId: 'instrument-drums', score: 2 },
  { memberId: 'member-bo', instrumentId: 'instrument-bass', score: 1 },
];

function renderMatrix(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MasteryMatrix members={MEMBERS} instruments={INSTRUMENTS} onError={() => undefined} />
    </QueryClientProvider>,
  );
}

function present<TElement extends HTMLElement>(element: TElement | null | undefined): TElement {
  if (element === null || element === undefined) throw new Error('element not rendered');
  return element;
}

// @FollowsBlueprint test-component-render
describe('MasteryMatrix', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stub = stubFetch(() => Promise.resolve(jsonResponse({ defaults: DEFAULTS })));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('puts one member per column, headed by their avatar in their stored colour', () => {
    renderMatrix();
    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((header) => header.textContent)).toEqual(['', 'AAda', 'BBo']);
    const adaAvatar = within(present(headers[1])).getByRole('img', { name: 'A' });
    expect(adaAvatar.style.backgroundColor).toBe('rgb(192, 57, 43)');
  });

  it('puts one instrument per row, with its average, and one score field per member', async () => {
    renderMatrix();
    await waitFor(() => expect(screen.getByLabelText('Ada Bass')).toHaveProperty('value', '4'));
    const bassRow = screen.getByRole('rowheader', { name: /Bass/ }).closest('tr');
    expect(bassRow?.textContent).toContain('2.5');
    expect(within(present(bassRow)).getAllByRole('spinbutton')).toHaveLength(MEMBERS.length);
  });

  it('closes on each member average in the footer', async () => {
    renderMatrix();
    await waitFor(() => expect(screen.getByLabelText('Ada Bass')).toHaveProperty('value', '4'));
    const footer = screen.getByRole('rowheader', { name: 'Avg' }).closest('tr');
    expect(
      within(present(footer))
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['3.0', '1.0']);
  });

  it('carries its title and the table, with no explanation between them', () => {
    renderMatrix();
    const matrix = screen.getByTestId('mastery-matrix');
    expect(matrix.querySelector('p')).toBe(null);
  });
});
