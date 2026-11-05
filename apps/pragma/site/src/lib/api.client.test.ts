import { REALTIME_CLIENT_HEADER } from '@domain/stale-scope.core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, REALTIME_CLIENT_ID } from './api.client';

function readSentHeader(): string | null {
  const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
  return new Headers(init?.headers).get(REALTIME_CLIENT_HEADER);
}

// @FollowsBlueprint test-pure-unit
describe('the tab id on API calls', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('signs a write with the id this tab drew, so its own socket is not told about it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
    );

    await api.api.tasks.$post({ json: { title: 'Restring the bass' } });

    expect(readSentHeader()).toBe(REALTIME_CLIENT_ID);
    expect(REALTIME_CLIENT_ID).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sends no tab id on a read, which no socket hears about', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
    );

    await api.api.tasks.$get({ query: {} });

    expect(readSentHeader()).toBeNull();
  });
});
