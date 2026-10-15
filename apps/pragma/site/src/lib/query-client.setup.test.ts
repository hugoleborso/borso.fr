import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api.client';
import { authKeys, type SessionProbeResult } from './queries/auth.queries';
import { queryClient } from './query-client.setup';
import { hasSessionMarker, rememberSessionMarker } from './session-marker.adapter';

function answerWith(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status }))),
  );
}

function sessionProbe(): SessionProbeResult | undefined {
  return queryClient.getQueryData<SessionProbeResult>(authKeys.session());
}

describe('a session the server stops accepting', () => {
  beforeEach(() => {
    localStorage.clear();
    rememberSessionMarker();
    queryClient.setQueryData<SessionProbeResult>(authKeys.session(), { authenticated: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    queryClient.clear();
  });

  it('ends in the tab as soon as any call is refused for it, so the gate sends the member to sign in', async () => {
    answerWith(401, { error: 'session-invalid', reason: 'bad-signature' });

    const response = await api.api.instruments.$get();

    expect(response.status).toBe(401);
    expect(hasSessionMarker()).toBe(false);
    expect(sessionProbe()).toStrictEqual({ authenticated: false });
  });

  it('stays open when a 401 refuses what was sent, such as a wrong current password', async () => {
    answerWith(401, { error: 'invalid-password' });

    await api.api.instruments.$get();

    expect(hasSessionMarker()).toBe(true);
    expect(sessionProbe()).toStrictEqual({ authenticated: true });
  });

  it('stays open on a 401 whose body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('Unauthorized', { status: 401 }))),
    );

    await api.api.instruments.$get();

    expect(hasSessionMarker()).toBe(true);
  });

  it('stays open on an answer that is not a 401', async () => {
    answerWith(500, { error: 'session-invalid' });

    await api.api.instruments.$get();

    expect(hasSessionMarker()).toBe(true);
  });
});
