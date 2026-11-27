import { dehydrate, hydrate, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  deferred,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { concertRegistrationKeys } from '../../lib/queries/concert-registrations.queries';
import { isQueryPersisted } from '../../lib/queries/persisted-query.core';
import { ConcertsLandingPage } from './ConcertsLandingPage';

const A_CONCERT = 'aaaaaaaa-1111-4111-8111-111111111111';
const A_MEMBER = 'bbbbbbbb-2222-4222-8222-222222222222';
const A_REGISTRATION = 'cccccccc-3333-4333-8333-333333333333';
const LATER_CONCERT = 'dddddddd-4444-4444-8444-444444444444';
const NEXT_CONCERT = {
  sessionId: A_CONCERT,
  date: '2026-11-28T20:30:00.000Z',
  venue: 'Le Pop-Up du Label',
  message: 'Entrée libre\nVenez tôt',
  posterUrl: null,
  prize: { label: '3 beers to win', icon: 'beer' },
  registrationCount: 4,
};
const UPCOMING = {
  concerts: [
    NEXT_CONCERT,
    { ...NEXT_CONCERT, sessionId: LATER_CONCERT, venue: 'Le Grand Mix', prize: null },
  ],
};
const MEMBERS = { members: [{ id: A_MEMBER, firstName: 'Hugo', color: '#3a9b9b' }] };
const A_TRACK = { deezerTrackId: 'dz-7923756', title: 'Valerie', artist: 'Mark Ronson' };
const SETTLED_SEARCH = { timeout: 3000 } as const;

const activeStubs: FetchStub[] = [];

function isRegistrationPost(request: Request): boolean {
  return request.method === 'POST' && request.url.includes('/registrations');
}

function isRegistrationCheck(request: Request): boolean {
  return request.method === 'GET' && request.url.includes('/concert-registrations/registrations/');
}

function renderPage(
  answerSignUp: (request: Request) => Promise<Response>,
  upcoming: unknown = UPCOMING,
  checkStatus = 200,
  queryClient = createIsolatedQueryClient(),
): FetchStub {
  const fetchStub = stubFetch(async (request) => {
    if (isRegistrationPost(request)) return await answerSignUp(request);
    if (isRegistrationCheck(request)) {
      return jsonResponse({ registrationId: A_REGISTRATION }, checkStatus);
    }
    if (request.method === 'PATCH') {
      return jsonResponse({ registration: { comingForMemberId: A_MEMBER, wishedSong: null } });
    }
    if (request.url.includes('/members')) return jsonResponse(MEMBERS);
    if (request.url.includes('/audience/search')) return jsonResponse({ hits: [A_TRACK] });
    return jsonResponse(upcoming);
  });
  activeStubs.push(fetchStub);
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ConcertsLandingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return fetchStub;
}

async function fillAndConfirm(firstName: string, email: string): Promise<void> {
  fireEvent.change(await screen.findByLabelText('First name'), { target: { value: firstName } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveProperty('disabled', false);
  });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
}

async function signUp(email = 'lea@example.com'): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: "I'll be there!" }));
  await fillAndConfirm('Léa', email);
}

// @FollowsBlueprint test-component-render
describe('the public concert sign-up page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    for (const stub of activeStubs.splice(0)) stub.restore();
  });

  it('shows only the next concert, its venue as a map search, its message and its prize, and no way to the members area', async () => {
    renderPage(() => Promise.resolve(jsonResponse({}, 500)));
    const venue = await screen.findByRole('link', { name: 'Le Pop-Up du Label' });
    expect(venue.getAttribute('href')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Le+Pop-Up+du+Label',
    );
    expect(screen.queryByText('Le Grand Mix')).toBeNull();
    expect(screen.getByText(/Entrée libre/).className).toContain('whitespace-pre-line');
    expect(screen.getByText(/Entrée libre/).className).not.toContain('order-last');
    expect(screen.getByText('3 beers to win')).toBeTruthy();
    expect(screen.getByText('28')).toBeTruthy();
    expect(screen.getByText('November')).toBeTruthy();
    expect(screen.getByText('Saturday')).toBeTruthy();
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('offers the concert as a calendar file, opened in place', async () => {
    renderPage(() => Promise.resolve(jsonResponse({}, 500)));
    const calendar = await screen.findByRole('link', { name: 'Calendar' });
    expect(calendar.getAttribute('title')).toBe('Add to my calendar');
    expect(calendar.getAttribute('href')).toBe(
      `/api/concert-registrations/concerts/${NEXT_CONCERT.sessionId}/calendar`,
    );
    expect(calendar.getAttribute('target')).toBeNull();
  });

  it('moves the message after the prize coupon on a phone only when the concert has a poster', async () => {
    renderPage(() => Promise.resolve(jsonResponse({}, 500)), {
      concerts: [{ ...NEXT_CONCERT, posterUrl: 'https://cdn.example/poster.png' }],
    });
    expect((await screen.findByText(/Entrée libre/)).className).toContain('max-md:order-last');
  });

  it('caps the poster on a phone to the screen the ticket and the button leave, tighter with a prize', async () => {
    const posterUrl = 'https://cdn.example/poster.png';
    renderPage(() => Promise.resolve(jsonResponse({}, 500)), {
      concerts: [{ ...NEXT_CONCERT, posterUrl }],
    });
    const cappedWithPrize = (await screen.findByAltText(/Le Pop-Up du Label/)).className;
    cleanup();
    renderPage(() => Promise.resolve(jsonResponse({}, 500)), {
      concerts: [{ ...NEXT_CONCERT, posterUrl, prize: null }],
    });
    const cappedWithoutPrize = (await screen.findByAltText(/Le Pop-Up du Label/)).className;
    expect(cappedWithPrize).toContain('object-contain');
    expect(cappedWithPrize).toContain('max-md:max-h-[calc(100dvh-365px-');
    expect(cappedWithoutPrize).toContain('max-md:max-h-[calc(100dvh-275px-');
  });

  it('shows no prize coupon when the concert has none', async () => {
    renderPage(() => Promise.resolve(jsonResponse({}, 500)), {
      concerts: [{ ...NEXT_CONCERT, prize: null, message: null }],
    });
    expect(await screen.findByRole('link', { name: 'Le Pop-Up du Label' })).toBeTruthy();
    expect(screen.queryByText('3 beers to win')).toBeNull();
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
    expect(await screen.findByText('Who in the band are you coming to support?')).toBeTruthy();
    expect(screen.getByText("You're signed up, Léa!")).toBeTruthy();
    expect(localStorage.getItem(`pragma.registration.${A_CONCERT}`)).toContain('token-1');
    const sent: unknown = await fetchStub.calls.find(isRegistrationPost)?.clone().json();
    expect(sent).toStrictEqual({ firstName: 'Léa', email: 'lea@example.com' });

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Hugo' }));
    await user.type(screen.getByRole('searchbox'), 'valerie');
    await user.click(await screen.findByRole('option', { name: /Valerie/ }, SETTLED_SEARCH));
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Signed up')).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    const patch = fetchStub.calls.find((call) => call.method === 'PATCH');
    expect(patch?.headers.get('x-registration-token')).toBe('token-1');
    const answers: unknown = await patch?.clone().json();
    expect(answers).toStrictEqual({ comingForMemberId: A_MEMBER, wishedTrackId: 'dz-7923756' });
  });

  it('skips both questions without sending anything, then shows the fan as signed up', async () => {
    const fetchStub = renderPage(() =>
      Promise.resolve(jsonResponse({ registrationId: A_REGISTRATION, editToken: 'token-1' }, 201)),
    );
    await signUp();
    fireEvent.click(await screen.findByRole('button', { name: 'Hugo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(await screen.findByText('Signed up')).toBeTruthy();
    expect(fetchStub.calls.filter((call) => call.method === 'PATCH')).toEqual([]);
  });

  it('says the email is already signed up when the server refuses a second one', async () => {
    renderPage(() => Promise.resolve(jsonResponse({ error: 'already-registered' }, 409)));
    await signUp();
    expect(await screen.findByText('This email is already signed up for this gig')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: /Le Pop-Up du Label/ })).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>('First name').value).toBe('Léa');
    expect(screen.queryByText('Signed up')).toBeNull();
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
    expect(await screen.findByText('Signed up')).toBeTruthy();
    expect(screen.queryByRole('button', { name: "I'll be there!" })).toBeNull();
    expect(screen.queryByLabelText('Email')).toBeNull();
    expect(screen.getByRole('link', { name: 'Calendar' })).toBeTruthy();
  });

  it('offers the sign-up again when the band removed the registration this browser remembers', async () => {
    localStorage.setItem(
      `pragma.registration.${A_CONCERT}`,
      JSON.stringify({ registrationId: A_REGISTRATION, editToken: 'token-1' }),
    );
    const fetchStub = renderPage(() => Promise.resolve(jsonResponse({}, 500)), UPCOMING, 404);
    expect(await screen.findByRole('button', { name: "I'll be there!" })).toBeTruthy();
    expect(screen.queryByText('Signed up')).toBeNull();
    expect(localStorage.getItem(`pragma.registration.${A_CONCERT}`)).toBeNull();
    const check = fetchStub.calls.find(isRegistrationCheck);
    expect(check?.headers.get('x-registration-token')).toBe('token-1');
  });

  it('checks the remembered registration again on the next visit, after an earlier visit found it standing', async () => {
    localStorage.setItem(
      `pragma.registration.${A_CONCERT}`,
      JSON.stringify({ registrationId: A_REGISTRATION, editToken: 'token-1' }),
    );
    const firstVisit = createIsolatedQueryClient();
    renderPage(() => Promise.resolve(jsonResponse({}, 500)), UPCOMING, 200, firstVisit);
    await waitFor(() => {
      expect(firstVisit.getQueryData(concertRegistrationKeys.remembered(A_REGISTRATION))).toEqual({
        isStanding: true,
      });
    });
    const savedOnThePhone = dehydrate(firstVisit, { shouldDehydrateQuery: isQueryPersisted });
    cleanup();
    for (const stub of activeStubs.splice(0)) stub.restore();

    const nextVisit = createIsolatedQueryClient();
    hydrate(nextVisit, savedOnThePhone);
    const fetchStub = renderPage(
      () => Promise.resolve(jsonResponse({}, 500)),
      UPCOMING,
      404,
      nextVisit,
    );

    expect(await screen.findByRole('button', { name: "I'll be there!" })).toBeTruthy();
    expect(fetchStub.calls.some(isRegistrationCheck)).toBe(true);
    expect(localStorage.getItem(`pragma.registration.${A_CONCERT}`)).toBeNull();
  });

  it('keeps a remembered registration signed up when its check is refused for another reason', async () => {
    localStorage.setItem(
      `pragma.registration.${A_CONCERT}`,
      JSON.stringify({ registrationId: A_REGISTRATION, editToken: 'token-1' }),
    );
    const fetchStub = renderPage(() => Promise.resolve(jsonResponse({}, 500)), UPCOMING, 403);
    await waitFor(() => {
      expect(fetchStub.calls.some(isRegistrationCheck)).toBe(true);
    });
    expect(await screen.findByText('Signed up')).toBeTruthy();
    expect(localStorage.getItem(`pragma.registration.${A_CONCERT}`)).not.toBeNull();
  });

  it('offers the sign-up for a next concert the browser never signed up for, once the remembered list refreshes', async () => {
    localStorage.setItem(
      `pragma.registration.${A_CONCERT}`,
      JSON.stringify({ registrationId: A_REGISTRATION, editToken: 'token-1' }),
    );
    const laterConcertOnly = {
      concerts: [{ ...NEXT_CONCERT, sessionId: LATER_CONCERT, venue: 'Le Grand Mix' }],
    };
    activeStubs.push(stubFetch(() => Promise.resolve(jsonResponse(laterConcertOnly))));
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(concertRegistrationKeys.upcoming(), UPCOMING);
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ConcertsLandingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Signed up')).toBeTruthy();
    expect(await screen.findByRole('link', { name: 'Le Grand Mix' })).toBeTruthy();
    expect(screen.getByRole('button', { name: "I'll be there!" })).toBeTruthy();
    expect(screen.queryByText('Signed up')).toBeNull();
  });

  it('signs up a friend from the same browser, asks them the questions, and keeps the first sign-up remembered', async () => {
    const stored = JSON.stringify({ registrationId: A_REGISTRATION, editToken: 'token-1' });
    localStorage.setItem(`pragma.registration.${A_CONCERT}`, stored);
    renderPage(() =>
      Promise.resolve(jsonResponse({ registrationId: A_MEMBER, editToken: 'token-2' }, 201)),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Sign up a friend' }));
    await fillAndConfirm('Max', 'max@example.com');
    expect(await screen.findByText("You're signed up, Max!")).toBeTruthy();
    expect(localStorage.getItem(`pragma.registration.${A_CONCERT}`)).toBe(stored);
  });

  it('closes the sign-up sheet without sending anything', async () => {
    const fetchStub = renderPage(() => Promise.resolve(jsonResponse({}, 500)));
    fireEvent.click(await screen.findByRole('button', { name: "I'll be there!" }));
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(fetchStub.calls.filter(isRegistrationPost)).toEqual([]);
  });

  it('sends the installed app to the members area, where it opened before the ERP moved to /app', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: true, media: query }));
    renderInstalledAppAtHome();
    expect(await screen.findByText('members area')).toBeTruthy();
    expect(screen.queryByRole('button', { name: "I'll be there!" })).toBeNull();
  });
});

function renderInstalledAppAtHome(): void {
  activeStubs.push(stubFetch(() => Promise.resolve(jsonResponse(UPCOMING))));
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ConcertsLandingPage />} />
          <Route path="/app" element={<p>members area</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
