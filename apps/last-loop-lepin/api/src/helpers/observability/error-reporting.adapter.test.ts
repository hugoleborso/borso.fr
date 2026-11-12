import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  findActiveTraceId,
  recordAttributesOnActiveSpan,
  reportUnhandledError,
  startErrorReporting,
  traceIncomingRequest,
} from './error-reporting.adapter';

const requestSpan = vi.hoisted(() => ({
  setAttribute: vi.fn(),
  spanContext: vi.fn(() => ({ traceId: '0123456789abcdef0123456789abcdef' })),
}));

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  isInitialized: vi.fn(() => false),
  captureException: vi.fn(),
  flush: vi.fn(() => Promise.resolve(true)),
  withIsolationScope: vi.fn((callback: () => unknown) => callback()),
  continueTrace: vi.fn((_trace: unknown, callback: () => unknown) => callback()),
  startSpan: vi.fn((_options: unknown, callback: (span: typeof requestSpan) => unknown) =>
    callback(requestSpan),
  ),
  updateSpanName: vi.fn(),
  getActiveSpan: vi.fn((): typeof requestSpan | undefined => requestSpan),
  setHttpStatus: vi.fn(),
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

  it('starts the SDK tagged with the app in the shared project, with every personal data category off and no trace header sent outward', () => {
    startErrorReporting({ dsn: DSN, environment: 'prod', tracesSampleRate: 1, release: 'abc123' });

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'prod',
      release: 'abc123',
      initialScope: { tags: { app: 'last-loop-lepin' } },
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
      integrations: [{ name: 'PostgresJs' }],
    });
  });

  it('leaves the release to the SDK when none was given', () => {
    startErrorReporting({ dsn: DSN, environment: 'preview', tracesSampleRate: 1 });

    expect(sentry.init.mock.calls[0]?.[0]).not.toHaveProperty('release');
  });
});

describe('reportUnhandledError', () => {
  it('hands the failure to the SDK, which traceIncomingRequest flushes once the request span ends', () => {
    const failure = new Error('boom');

    reportUnhandledError(failure);

    expect(sentry.captureException).toHaveBeenCalledWith(failure);
  });
});

describe('recordAttributesOnActiveSpan', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sets every field on the active span, a list as a copy the SDK may keep', () => {
    const failedSteps: readonly string[] = ['first'];

    recordAttributesOnActiveSpan({
      'runner.id': 'runner-1',
      duration_ms: 12,
      'lambda.cold_start': false,
      'job.failed_steps': failedSteps,
    });

    expect(requestSpan.setAttribute.mock.calls).toStrictEqual([
      ['runner.id', 'runner-1'],
      ['duration_ms', 12],
      ['lambda.cold_start', false],
      ['job.failed_steps', ['first']],
    ]);
    expect(requestSpan.setAttribute.mock.calls[3]?.[1]).not.toBe(failedSteps);
  });

  it('records nothing when no span is active', () => {
    sentry.getActiveSpan.mockReturnValueOnce(undefined);

    recordAttributesOnActiveSpan({ 'runner.id': 'runner-1' });

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

  it('answers inside a server span continuing the caller trace, then flushes before the Lambda freezes', async () => {
    sentry.isInitialized.mockReturnValueOnce(true);
    const answer = vi.fn(() => Promise.resolve({ route: '/api/editions/:slug', status: 500 }));

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
    expect(sentry.updateSpanName).toHaveBeenCalledWith(requestSpan, 'GET /api/editions/:slug');
    expect(requestSpan.setAttribute).toHaveBeenCalledWith('http.route', '/api/editions/:slug');
    expect(sentry.setHttpStatus).toHaveBeenCalledWith(requestSpan, 500);
    expect(sentry.flush).toHaveBeenCalledWith(2_000);
  });
});
