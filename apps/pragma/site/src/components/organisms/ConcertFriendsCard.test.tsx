import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { ConcertFriendsCard } from './ConcertFriendsCard';

const SESSION_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const ARN = { id: 'bbbbbbbb-2222-4222-8222-222222222222', firstName: 'Arn', color: '#2d5fa0' };
const GUI = { id: 'cccccccc-3333-4333-8333-333333333333', firstName: 'Gui', color: '#5ddf73' };

function registration(index: number, comingFor: typeof ARN | null) {
  return {
    id: `0000000${String(index)}-4444-4444-8444-444444444444`,
    firstName: `Fan ${String(index)}`,
    email: `fan${String(index)}@example.com`,
    registeredAt: '2026-11-01T19:00:00.000Z',
    comingFor: comingFor === null ? null : { id: comingFor.id, firstName: comingFor.firstName },
    wishedSong: null,
  };
}

const REGISTRATIONS = [
  registration(1, ARN),
  registration(2, ARN),
  registration(3, null),
  registration(4, GUI),
  registration(5, null),
];

// @FollowsBlueprint test-component-render
describe('ConcertFriendsCard', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stub = stubFetch((request) =>
      Promise.resolve(
        new URL(request.url).pathname ===
          `/api/concert-registrations/concerts/${SESSION_ID}/registrations`
          ? jsonResponse({ registrations: REGISTRATIONS })
          : new Response(null, { status: 404 }),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it("reads each member's registrations against the expected count, then those who chose nobody", async () => {
    render(
      <QueryClientProvider client={createIsolatedQueryClient()}>
        <ConcertFriendsCard
          session={{
            id: SESSION_ID,
            capacity: 150,
            friendsCountPerMember: { [ARN.id]: 5, [GUI.id]: 4 },
          }}
          members={[ARN, GUI]}
        />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('3% · 5/150')).toBeTruthy();
    expect(screen.getByText('5', { selector: 'b' }).parentElement?.textContent).toBe(
      '5 registered · 9 expected',
    );
    expect(screen.getByText('Arn').closest('div')?.textContent).toBe('Arn2 / 5');
    expect(screen.getByText('Gui').closest('div')?.textContent).toBe('Gui1 / 4');
    expect(screen.getByText('No pref.').closest('div')?.textContent).toBe('No pref.2');
    expect(screen.getByText('registered')).toBeTruthy();
    expect(screen.getByText('expected')).toBeTruthy();
  });
});
