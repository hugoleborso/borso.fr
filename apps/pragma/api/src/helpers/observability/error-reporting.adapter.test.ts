import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  findActiveTraceId,
  flushErrorReports,
  recordAttributesOnActiveSpan,
  recordReadBatchSize,
  reportTaggedFailure,
  reportUnhandledError,
  startErrorReporting,
  traceIncomingRequest,
} from './error-reporting.adapter';
import { redactDatabaseSpan } from './database-span.core';
import { isUnrecordedOutgoingRequest } from './error-reporting.core';

const requestSpan = vi.hoisted(() => ({
  setAttribute: vi.fn(),
  spanContext: vi.fn(() => ({ traceId: '0123456789abcdef0123456789abcdef' })),
}));

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
  getActiveSpan: vi.fn((): typeof requestSpan | undefined => requestSpan),
  setHttpStatus: vi.fn(),
  nativeNodeFetchIntegration: vi.fn((options: unknown) => ({ name: 'NodeFetch', options })),
  postgresJsIntegration: vi.fn(() => ({ name: 'PostgresJs' })),
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

  it('starts the SDK with every personal data category off, no trace header sent outward and no SQL on a database span', () => {
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
      enableRuntimeChannelInjection: false,
      integrations: [
        { name: 'NodeFetch', options: { ignoreOutgoingRequests: isUnrecordedOutgoingRequest } },
        { name: 'PostgresJs' },
      ],
      beforeSendSpan: redactDatabaseSpan,
    });
  });

  it('registers no module hook, which a bundle cannot load and which costs a worker thread at every cold start', () => {
    startErrorReporting({ dsn: DSN, environment: 'prod', tracesSampleRate: 1 });

    expect(sentry.init.mock.calls[0]?.[0]).toHaveProperty('enableRuntimeChannelInjection', false);
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

describe('recordReadBatchSize', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sets the number of reads on the span of the batch request', () => {
    recordReadBatchSize(7);

    expect(requestSpan.setAttribute).toHaveBeenCalledWith('read_batch.size', 7);
  });

  it('records nothing when no span is active', () => {
    sentry.getActiveSpan.mockReturnValueOnce(undefined);

    recordReadBatchSize(7);

    expect(requestSpan.setAttribute).not.toHaveBeenCalled();
  });
});

describe('recordAttributesOnActiveSpan', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sets every field on the active span, a list as a copy the SDK may keep', () => {
    const failedHosts: readonly string[] = ['web.push.apple.com'];

    recordAttributesOnActiveSpan({
      'member.id': 'member-1',
      duration_ms: 12,
      'lambda.cold_start': false,
      'push.failed_hosts': failedHosts,
    });

    expect(requestSpan.setAttribute.mock.calls).toStrictEqual([
      ['member.id', 'member-1'],
      ['duration_ms', 12],
      ['lambda.cold_start', false],
      ['push.failed_hosts', ['web.push.apple.com']],
    ]);
    expect(requestSpan.setAttribute.mock.calls[3]?.[1]).not.toBe(failedHosts);
  });

  it('records nothing when no span is active', () => {
    sentry.getActiveSpan.mockReturnValueOnce(undefined);

    recordAttributesOnActiveSpan({ 'member.id': 'member-1' });

    expect(requestSpan.setAttribute).not.toHaveBeenCalled();
  });
});

describe('findActiveTraceId', () => {
  it('reads the trace id of the active span', () => {
    expect(findActiveTraceId()).toBe('0123456789abcdef0123456789abcdef');
  });

  it('answers null when no span is active', () => {
    sentry.getActiveSpan.mockReturnValueOnce(undefined);

    expect(findActiveTraceId()).toBeNull();
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

  it('answers inside a server span continuing the caller trace, and leaves the flush to the invocation', async () => {
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
    expect(sentry.flush).not.toHaveBeenCalled();
  });
});
