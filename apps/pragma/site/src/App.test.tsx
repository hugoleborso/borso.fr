import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './i18n/i18n.setup';
import { App } from './App';
import {
  createIsolatedQueryClient,
  jsonResponse,
  stubFetch,
} from './lib/queries/queries.test-utils';

// @FollowsBlueprint test-component-render
describe('the application shell', () => {
  let fetchStub: ReturnType<typeof stubFetch> | null = null;

  beforeEach(() => {
    localStorage.clear();
    globalThis.history.replaceState({}, '', '/vote');
  });

  afterEach(() => {
    cleanup();
    fetchStub?.restore();
    fetchStub = null;
    globalThis.history.replaceState({}, '', '/');
  });

  it('opens the vote page for a visitor with no session, without asking them to sign in', async () => {
    fetchStub = stubFetch(() => Promise.resolve(jsonResponse({ sessionId: null })));
    render(
      <QueryClientProvider client={createIsolatedQueryClient()}>
        <App />
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText(/No vote is running right now/)).toBeTruthy();
    });
    expect(screen.queryByLabelText(/password/i)).toBe(null);
    expect(fetchStub.calls.every((call) => !call.url.includes('/api/instruments'))).toBe(true);
  });
});
