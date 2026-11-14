import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import { accountKeys } from '@/lib/queries/account.queries';
import { openScreen, useAppScreen } from '@/navigation/navigation.store';
import { replaceSyncStatus } from '@/review/sync.store';
import { TopBar } from './TopBar';

// @FollowsBlueprint test-hook-probe
function AppScreenProbe() {
  const screen = useAppScreen();
  return <output data-testid="screen">{screen.kind}</output>;
}

function renderWithSession(children: ReactNode, signedIn: boolean | null = null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (signedIn !== null) queryClient.setQueryData(accountKeys.session(), { signedIn });
  render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
  return queryClient;
}

function answerJson(status: number, body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

// @FollowsBlueprint test-jsdom-gap-stub
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  replaceSyncStatus('idle');
});

async function openSettings(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
}

// @FollowsBlueprint test-component-render
describe('TopBar', () => {
  it('lets the user change the board style', async () => {
    renderWithSession(<TopBar />);
    await openSettings();
    const select = screen.getByRole('combobox', { name: 'Board style:' });
    await userEvent.selectOptions(select, 'nord');
    expect(select).toHaveProperty('value', 'nord');
  });

  it('opens Credits', async () => {
    openScreen({ kind: 'today' });
    renderWithSession(
      <>
        <TopBar />
        <AppScreenProbe />
      </>,
    );
    await openSettings();
    expect(screen.getByTestId('screen').textContent).toBe('today');
    await userEvent.click(screen.getByRole('button', { name: 'Credits' }));
    expect(screen.getByTestId('screen').textContent).toBe('credits');
    expect(screen.queryByRole('dialog', { name: 'Settings' })).toBeNull();
  });

  it('no longer carries the mode toggle, which lives in Explore', async () => {
    renderWithSession(<TopBar />);
    await openSettings();
    expect(screen.queryByRole('button', { name: 'Toggle mode' })).toBeNull();
  });

  it('shows no account link while the API has not answered, or when no API exists', async () => {
    renderWithSession(<TopBar />);
    await openSettings();
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
  });

  it('signs the operator in from the form and then offers sign-out', async () => {
    const fetchMock = vi.fn(() => answerJson(200, { signedIn: true }));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = renderWithSession(<TopBar />, false);
    await openSettings();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('heading', { name: 'Sign in to sync' })).toBeTruthy();
    const submit = screen.getAllByRole('button', { name: 'Sign in' })[1];
    if (submit === undefined) throw new Error('the form shows no submit button');
    expect(submit).toHaveProperty('disabled', true);
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse');
    await userEvent.click(submit);
    expect(await screen.findByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Sign in to sync' })).toBeNull();
    expect(queryClient.getQueryData(accountKeys.session())).toEqual({ signedIn: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [401, { error: 'invalid-credentials' }, 'Wrong password.'],
    [429, { error: 'rate-limited' }, 'Too many attempts. Try again later.'],
    [503, { error: 'auth-not-bootstrapped' }, 'Sign-in is not set up on this server yet.'],
    [500, { error: 'unexpected-failure' }, 'The server cannot be reached. Try again later.'],
  ])('keeps the form open and says why a %i sign-in failed', async (status, body, message) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => answerJson(status, body)),
    );
    renderWithSession(<TopBar />, false);
    await openSettings();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await userEvent.type(screen.getByLabelText('Password'), 'wrong{Enter}');
    expect((await screen.findByRole('alert')).textContent).toBe(message);
    expect(screen.getByRole('heading', { name: 'Sign in to sync' })).toBeTruthy();
  });

  it('closes the form without signing in', async () => {
    renderWithSession(<TopBar />, false);
    await openSettings();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('heading', { name: 'Sign in to sync' })).toBeNull();
  });

  it('signs out and offers sign-in again', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))),
    );
    renderWithSession(<TopBar />, true);
    await openSettings();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
  });

  it('stays signed in when the sign-out never reached the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => answerJson(500, {})),
    );
    const queryClient = renderWithSession(<TopBar />, true);
    await openSettings();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(queryClient.getQueryData(accountKeys.session())).toEqual({ signedIn: true });
  });

  it('says the session expired after a 401 and opens the sign-in form in the settings sheet', async () => {
    replaceSyncStatus('expired');
    openScreen({ kind: 'today' });
    renderWithSession(<TopBar />, false);
    expect(screen.getByRole('status').textContent).toBe(
      'Session expired. Sign in to keep syncing.Sign in',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Sign in to sync' })).toBeTruthy();
  });

  it('says nothing about an expired session to a device that never signed in', () => {
    renderWithSession(<TopBar />, false);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
