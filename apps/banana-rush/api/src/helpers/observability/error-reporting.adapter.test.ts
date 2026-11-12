import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameError } from '../errors/game-error.types';
import {
  findActiveTraceId,
  recordAttributesOnActiveSpan,
  reportHandlerFailures,
  reportUnexpectedFailure,
  startErrorReporting,
  traceIncomingRequest,
} from './error-reporting.adapter';
import { redactDatabaseSpan } from './database-span.core';

const requestSpan = vi.hoisted(() => ({
  setAttribute: vi.fn(),
  spanContext: vi.fn(() => ({ traceId: '0123456789abcdef0123456789abcdef' })),
}));

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  isInitialized: vi.fn(() => false),
  captureException: vi.fn(),
  wrapHandler: vi.fn(),
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

  it('traces under the release with every personal data category off, no trace header sent outward and no SQL on a database span, and no span per middleware', () => {
    startErrorReporting({
      dsn: DSN,
      environment: 'preview',
      tracesSampleRate: 1,
      release: '0123abcd',
    });

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'preview',
      release: '0123abcd',
      initialScope: { tags: { app: 'banana-rush' } },
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
      ignoreSpans: [{ op: 'middleware' }],
      integrations: [{ name: 'PostgresJs' }],
      beforeSendSpan: redactDatabaseSpan,
    });
  });

  it('leaves the release to the SDK when none was given', () => {
    startErrorReporting({ dsn: DSN, environment: 'prod', tracesSampleRate: 1 });

    expect(sentry.init.mock.calls[0]?.[0]).not.toHaveProperty('release');
  });
});

describe('reportUnexpectedFailure', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reports a failure the application did not name', () => {
    const failure = new Error('connection reset');

    reportUnexpectedFailure(failure);

    expect(sentry.captureException).toHaveBeenCalledWith(failure);
  });

  it('keeps a named refusal out of the reports, since the player was answered with it', () => {
    reportUnexpectedFailure(new GameError('game-full'));

    expect(sentry.captureException).not.toHaveBeenCalled();
  });
});

describe('reportHandlerFailures', () => {
  it('is the vendor wrapper that reports a thrown handler failure and flushes before the Lambda freezes', () => {
    expect(reportHandlerFailures).toBe(sentry.wrapHandler);
  });
});

describe('recordAttributesOnActiveSpan', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sets every field on the active span, a list as a copy the SDK may keep', () => {
    const steps: readonly string[] = ['bid'];

    recordAttributesOnActiveSpan({
      'game.code': 'ABCD',
      duration_ms: 12,
      'lambda.cold_start': false,
      'round.steps': steps,
    });

    expect(requestSpan.setAttribute.mock.calls).toStrictEqual([
      ['game.code', 'ABCD'],
      ['duration_ms', 12],
      ['lambda.cold_start', false],
      ['round.steps', ['bid']],
    ]);
    expect(requestSpan.setAttribute.mock.calls[3]?.[1]).not.toBe(steps);
  });

  it('records nothing when no span is active', () => {
    sentry.getActiveSpan.mockReturnValueOnce(undefined);

    recordAttributesOnActiveSpan({ 'game.code': 'ABCD' });

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
  });

  it('answers inside a server span continuing the caller trace, named after the route', async () => {
    sentry.isInitialized.mockReturnValueOnce(true);
    const answer = vi.fn(() => Promise.resolve({ route: '/api/games/:code', status: 404 }));

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
    expect(sentry.updateSpanName).toHaveBeenCalledWith(requestSpan, 'GET /api/games/:code');
    expect(requestSpan.setAttribute).toHaveBeenCalledWith('http.route', '/api/games/:code');
    expect(sentry.setHttpStatus).toHaveBeenCalledWith(requestSpan, 404);
  });
});
