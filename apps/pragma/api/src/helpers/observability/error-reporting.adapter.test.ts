import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  flushErrorReports,
  reportTaggedFailure,
  reportUnhandledError,
  startErrorReporting,
  traceIncomingRequest,
} from './error-reporting.adapter';
import { isUnrecordedOutgoingRequest } from './error-reporting.core';

const requestSpan = vi.hoisted(() => ({ setAttribute: vi.fn() }));

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  isInitialized: vi.fn(() => false),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  flush: vi.fn(() => Promise.resolve(true)),
  withIsolationScope: vi.fn((callback: () => unknown) => callback()),
  continueTrace: vi.fn((_trace: unknown, callback: () => unknown) => callback()),
  startSpan: vi.fn((_options: unknown, callback: (span: typeof requestSpan) => unknown) =>
    callback(requestSpan),
  ),
  updateSpanName: vi.fn(),
  setHttpStatus: vi.fn(),
  nativeNodeFetchIntegration: vi.fn((options: unknown) => ({ name: 'NodeFetch', options })),
}));

vi.mock('@sentry/aws-serverless', () => sentry);

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';
const SENTRY_TRACE = '0123456789abcdef0123456789abcdef-0123456789abcdef-1';
const BAGGAGE = 'sentry-trace_id=0123456789abcdef0123456789abcdef';

describe('startErrorReporting', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts nothing when no project is configured', () => {
    startErrorReporting(undefined);

    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('starts the SDK with every personal data category off and no trace header sent outward', () => {
    startErrorReporting({ dsn: DSN, environment: 'prod', tracesSampleRate: 1, release: 'abc123' });

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'prod',
      release: 'abc123',
      initialScope: { tags: { app: 'pragma' } },
      tracesSampleRate: 1,
      tracePropagationTargets: [],
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        databaseQueryData: false,
        stackFrameVariables: false,
      },
      integrations: [
        { name: 'NodeFetch', options: { ignoreOutgoingRequests: isUnrecordedOutgoingRequest } },
      ],
    });
  });

  it('leaves the release to the SDK when none was given', () => {
    startErrorReporting({ dsn: DSN, environment: 'preview', tracesSampleRate: 1 });

    expect(sentry.init.mock.calls[0]?.[0]).not.toHaveProperty('release');
  });
});

describe('reportUnhandledError', () => {
  it('hands the failure to the SDK', () => {
    const failure = new Error('boom');

    reportUnhandledError(failure);

    expect(sentry.captureException).toHaveBeenCalledWith(failure);
  });
});

describe('flushErrorReports', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('waits for the SDK to send what a scheduled job reported before the Lambda freezes', async () => {
    await flushErrorReports();

    expect(sentry.flush).toHaveBeenCalledWith(2_000);
  });
});

describe('reportTaggedFailure', () => {
  it('hands a named failure to the SDK as an error carrying its tags', () => {
    reportTaggedFailure({
      name: 'PushSendFailed',
      tags: { 'push.host': 'web.push.apple.com', 'push.status': '500' },
    });

    expect(sentry.captureMessage).toHaveBeenCalledWith('PushSendFailed', {
      level: 'error',
      tags: { 'push.host': 'web.push.apple.com', 'push.status': '500' },
    });
  });
});

describe('traceIncomingRequest', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const request = { method: 'GET', sentryTrace: SENTRY_TRACE, baggage: BAGGAGE };

  it('only answers while reporting is off', async () => {
    sentry.isInitialized.mockReturnValueOnce(false);
    const answer = vi.fn(() => Promise.resolve({ route: '/api/health', status: 200 }));

    await traceIncomingRequest(request, answer);

    expect(answer).toHaveBeenCalledOnce();
    expect(sentry.startSpan).not.toHaveBeenCalled();
    expect(sentry.flush).not.toHaveBeenCalled();
  });

  it('answers inside a server span continuing the caller trace, then flushes before the Lambda freezes', async () => {
    sentry.isInitialized.mockReturnValueOnce(true);
    const answer = vi.fn(() => Promise.resolve({ route: '/api/songs/:songId', status: 404 }));

    await traceIncomingRequest(request, answer);

    expect(sentry.continueTrace).toHaveBeenCalledWith(
      { sentryTrace: SENTRY_TRACE, baggage: BAGGAGE },
      expect.any(Function),
    );
    expect(sentry.startSpan).toHaveBeenCalledWith(
      {
        name: 'GET',
        op: 'http.server',
        forceTransaction: true,
        attributes: { 'http.request.method': 'GET' },
      },
      expect.any(Function),
    );
    expect(answer).toHaveBeenCalledOnce();
    expect(sentry.updateSpanName).toHaveBeenCalledWith(requestSpan, 'GET /api/songs/:songId');
    expect(requestSpan.setAttribute).toHaveBeenCalledWith('http.route', '/api/songs/:songId');
    expect(sentry.setHttpStatus).toHaveBeenCalledWith(requestSpan, 404);
    expect(sentry.flush).toHaveBeenCalledWith(2_000);
  });
});
