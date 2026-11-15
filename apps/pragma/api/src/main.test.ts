import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const httpHandler = vi.fn(() => Promise.resolve({ statusCode: 200 }));
const flushErrorReports = vi.fn(() => Promise.resolve());

vi.mock('@hono/aws-lambda', () => ({ handle: () => httpHandler }));
vi.mock('./app', () => ({ createApp: () => ({}) }));
vi.mock(import('./helpers/observability/error-reporting.adapter'), async (importOriginal) => ({
  ...(await importOriginal()),
  flushErrorReports: () => flushErrorReports(),
  startErrorReporting: () => undefined,
}));

async function loadHandler() {
  vi.resetModules();
  const module = await import('./main');
  return module.handler;
}

type Handler = Awaited<ReturnType<typeof loadHandler>>;
type HandlerEvent = Parameters<Handler>[0];

const HTTP_EVENT: HandlerEvent = {
  httpMethod: 'GET',
  path: '/api/health',
  headers: {},
  body: null,
  isBase64Encoded: false,
  requestContext: { elb: { targetGroupArn: 'arn:aws:elasticloadbalancing:test' } },
};

describe('handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('flushes once for one HTTP invocation, whatever the request did', async () => {
    const handler = await loadHandler();

    await handler(HTTP_EVENT);

    expect(httpHandler).toHaveBeenCalledOnce();
    expect(flushErrorReports).toHaveBeenCalledOnce();
  });

  it('returns what the HTTP handler answered', async () => {
    const handler = await loadHandler();

    await expect(handler(HTTP_EVENT)).resolves.toEqual({ statusCode: 200 });
  });

  it('flushes even when the HTTP handler throws, so the report is not lost', async () => {
    const failure = new Error('boom');
    httpHandler.mockRejectedValueOnce(failure);
    const handler = await loadHandler();

    await expect(handler(HTTP_EVENT)).rejects.toThrow('boom');

    expect(flushErrorReports).toHaveBeenCalledOnce();
  });
});
