import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  deferred,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { ConcertsLandingPage } from './ConcertsLandingPage';

const A_CONCERT = 'aaaaaaaa-1111-4111-8111-111111111111';
const A_MEMBER = 'bbbbbbbb-2222-4222-8222-222222222222';
const A_REGISTRATION = 'cccccccc-3333-4333-8333-333333333333';
const UPCOMING = {
  concerts: [
    {
      sessionId: A_CONCERT,
      date: '2026-11-28T20:30:00.000Z',
      venue: 'Le Pop-Up du Label',
      message: 'Entrée libre\nVenez tôt',
      posterUrl: null,
      registrationCount: 4,
    },
  ],
};
const MEMBERS = { members: [{ id: A_MEMBER, firstName: 'Hugo' }] };

const activeStubs: FetchStub[] = [];

function isRegistrationPost(request: Request): boolean {
  return request.method === 'POST' && request.url.includes('/registrations');
}

function answerReads(request: Request): Response {
  if (request.url.includes('/members')) return jsonResponse(MEMBERS);
  return jsonResponse(UPCOMING);
}

function renderPage(answerSignUp: (request: Request) => Promise<Response>): FetchStub {
  const fetchStub = stubFetch(async (request) => {
    if (isRegistrationPost(request)) return await answerSignUp(request);
    if (request.method === 'PATCH') {
      return jsonResponse({ registration: { comingForMemberId: A_MEMBER, wishedSong: null } });
    }
    return answerReads(request);
  });
  activeStubs.push(fetchStub);
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter>
        <ConcertsLandingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return fetchStub;
}

async function signUp(email = 'lea@example.com'): Promise<void> {
  fireEvent.change(await screen.findByLabelText('First name'), { target: { value: 'Léa' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  await waitFor(() => {
    expect(screen.getByRole('button', { name: "I'll be there!" })).toHaveProperty(
      'disabled',
      false,
    );
  });
  fireEvent.click(screen.getByRole('button', { name: "I'll be there!" }));
}

// @FollowsBlueprint test-component-render
describe('the public concert sign-up page', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    for (const stub of activeStubs.splice(0)) stub.restore();
  });

  it('shows each upcoming concert with its venue and message, and a discreet way to the members area', async () => {
    renderPage(() => Promise.resolve(jsonResponse({}, 500)));
    expect(await screen.findByText('Le Pop-Up du Label')).toBeTruthy();
    expect(screen.getByText(/Entrée libre/).className).toContain('whitespace-pre-line');
    expect(screen.getByRole('link', { name: 'Members area' }).getAttribute('href')).toBe('/app');
  });

  it('says so when no concert is ahead', async () => {
    activeStubs.push(stubFetch(() => Promise.resolve(jsonResponse({ concerts: [] }))));
    render(
      <QueryClientProvider client={createIsolatedQueryClient()}>
        <MemoryRouter>
          <ConcertsLandingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText(/No gig planned yet/)).toBeTruthy();
  });

  it('shows the tuning screen while the sign-up is on its way', async () => {
    const answer = deferred<Response>();
    renderPage(() => answer.promise);
    await signUp();
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain('Tuning up…');
    });
    answer.resolve(jsonResponse({ registrationId: A_REGISTRATION, editToken: 'token-1' }, 201));
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it('signs up, remembers it in the browser, then asks who they come for', async () => {
    const fetchStub = renderPage((request) => {
      expect(request.url).toContain(
        `/api/concert-registrations/concerts/${A_CONCERT}/registrations`,
      );
      return Promise.resolve(
        jsonResponse({ registrationId: A_REGISTRATION, editToken: 'token-1' }, 201),
      );
    });
    await signUp(' Lea@Example.com ');
    expect(await screen.findByText('Who are you coming for?')).toBeTruthy();
    expect(localStorage.getItem(`pragma.registration.${A_CONCERT}`)).toContain('token-1');
    const sent: unknown = await fetchStub.calls.find(isRegistrationPost)?.clone().json();
    expect(sent).toStrictEqual({ firstName: 'Léa', email: 'lea@example.com' });

    fireEvent.click(await screen.findByRole('button', { name: 'Hugo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText(/Thank you!/)).toBeTruthy();
    const patch = fetchStub.calls.find((call) => call.method === 'PATCH');
    expect(patch?.headers.get('x-registration-token')).toBe('token-1');
  });

  it('skips both questions without sending anything, then thanks the fan', async () => {
    const fetchStub = renderPage(() =>
      Promise.resolve(jsonResponse({ registrationId: A_REGISTRATION, editToken: 'token-1' }, 201)),
    );
    await signUp();
    fireEvent.click(await screen.findByRole('button', { name: 'Hugo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(await screen.findByText(/Thank you!/)).toBeTruthy();
    expect(fetchStub.calls.filter((call) => call.method === 'PATCH')).toEqual([]);
  });

  it('says the email is already signed up when the server refuses a second one', async () => {
    renderPage(() => Promise.resolve(jsonResponse({ error: 'already-registered' }, 409)));
    await signUp();
    expect(await screen.findByText('This email is already signed up for this gig')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('asks for a real email under the field when the address is a throwaway one', async () => {
    renderPage(() => Promise.resolve(jsonResponse({ error: 'disposable-email' }, 422)));
    await signUp('x@yopmail.com');
    const refusal = await screen.findByText(/Throwaway addresses can't enter the draw/);
    expect(screen.getByLabelText('Email').getAttribute('aria-describedby')).toBe(refusal.id);
  });

  it('shows a concert already signed up for in this browser as done', async () => {
    localStorage.setItem(
      `pragma.registration.${A_CONCERT}`,
      JSON.stringify({ registrationId: A_REGISTRATION, editToken: 'token-1' }),
    );
    renderPage(() => Promise.resolve(jsonResponse({}, 500)));
    expect(await screen.findByText(/You're signed up/)).toBeTruthy();
    expect(screen.queryByLabelText('Email')).toBeNull();
  });
});
