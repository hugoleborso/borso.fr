import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { AnsweredRequest, IncomingRequest } from './error-reporting.adapter';
import { buildRequestTracing } from './request-tracing.middleware';

const SENTRY_TRACE = '0123456789abcdef0123456789abcdef-0123456789abcdef-1';
const BAGGAGE = 'sentry-trace_id=0123456789abcdef0123456789abcdef';

interface RecordedTrace {
  readonly request: IncomingRequest;
  readonly answered: AnsweredRequest;
}

function buildTracedApp(recorded: RecordedTrace[]): Hono {
  const traceRequest = vi.fn(
    async (request: IncomingRequest, answer: () => Promise<AnsweredRequest>) => {
      recorded.push({ request, answered: await answer() });
    },
  );
  const songs = new Hono().get('/:songId', (context) => context.json({ ok: true }));
  return new Hono().use('*', buildRequestTracing(traceRequest)).route('/api/songs', songs);
}

// @FollowsBlueprint test-middleware-integration
describe('buildRequestTracing', () => {
  it('continues the caller trace and names the request after its route, not its path', async () => {
    const recorded: RecordedTrace[] = [];

    const response = await buildTracedApp(recorded).request('/api/songs/42?search=secret', {
      headers: { 'sentry-trace': SENTRY_TRACE, baggage: BAGGAGE },
    });

    expect(response.status).toBe(200);
    expect(recorded).toEqual([
      {
        request: { method: 'GET', sentryTrace: SENTRY_TRACE, baggage: BAGGAGE },
        answered: { route: '/api/songs/:songId', status: 200 },
      },
    ]);
  });

  it('starts a fresh trace when the caller sent none, and records an unmatched path as such', async () => {
    const recorded: RecordedTrace[] = [];

    const response = await buildTracedApp(recorded).request('/api/nowhere');

    expect(response.status).toBe(404);
    expect(recorded).toEqual([
      {
        request: { method: 'GET', sentryTrace: undefined, baggage: undefined },
        answered: { route: 'unmatched route', status: 404 },
      },
    ]);
  });
});
