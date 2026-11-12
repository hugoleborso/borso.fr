import { withoutPrivateContent } from '@domain/error-reporting.core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  findActiveTraceId,
  recordAttributesOnActiveSpan,
  reportUnhandledError,
  selectTracedIntegrations,
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
  nativeNodeFetchIntegration: vi.fn(
    (options: { readonly ignoreOutgoingRequests: (url: string) => boolean }) => ({
      name: 'NodeFetch',
      options,
    }),
  ),
}));

vi.mock('@sentry/aws-serverless', () => sentry);

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';
const SENTRY_TRACE = '0123456789abcdef0123456789abcdef-0123456789abcdef-1';
const BAGGAGE = 'sentry-trace_id=0123456789abcdef0123456789abcdef';

afterEach(() => {
  vi.clearAllMocks();
});

describe('startErrorReporting', () => {
  it('starts nothing when no project is configured', () => {
    startErrorReporting(undefined);

    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('starts tracing tagged talos, with every data category, breadcrumb, request field and outgoing trace header off', () => {
    startErrorReporting({ dsn: DSN, environment: 'prod', tracesSampleRate: 1, release: 'abc123' });

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'prod',
      release: 'abc123',
      initialScope: { tags: { app: 'talos' } },
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        databaseQueryData: false,
        stackFrameVariables: false,
        queues: false,
        graphQL: { document: false, variables: false },
        genAI: { inputs: false, outputs: false },
        frameContextLines: 0,
      },
      maxBreadcrumbs: 0,
      tracesSampleRate: 1,
      tracePropagationTargets: [],
      enableRuntimeChannelInjection: false,
      integrations: selectTracedIntegrations,
      beforeSend: withoutPrivateContent,
    });
  });

  it('leaves the release to the SDK when none was given', () => {
    startErrorReporting({ dsn: DSN, environment: 'prod', tracesSampleRate: 1 });

    expect(sentry.init.mock.calls[0]?.[0]).not.toHaveProperty('release');
  });
});

describe('selectTracedIntegrations', () => {
  it('installs no database integration over the SDK defaults, so no span carries SQL text', async () => {
    const { getDefaultIntegrations } =
      await vi.importActual<typeof import('@sentry/aws-serverless')>('@sentry/aws-serverless');

    const names = selectTracedIntegrations(getDefaultIntegrations({})).map(
      (integration) => integration.name,
    );

    expect(names).not.toContain('Postgres');
    expect(names).not.toContain('PostgresJs');
  });

  it('replaces the default fetch integration with one that records no outgoing fetch', () => {
    const integrations = selectTracedIntegrations([
      { name: 'Http' },
      { name: 'NodeFetch' },
      { name: 'Aws' },
    ]);

    expect(integrations.map((integration) => integration.name)).toStrictEqual([
      'Http',
      'Aws',
      'NodeFetch',
    ]);
    const ignoreOutgoingRequests =
      sentry.nativeNodeFetchIntegration.mock.calls[0]?.[0].ignoreOutgoingRequests;
    expect(ignoreOutgoingRequests?.('https://api.github.com/repos')).toBe(true);
  });
});

describe('reportUnhandledError', () => {
  it('hands the failure to the SDK and waits for it to leave before the Lambda freezes', async () => {
    const failure = new Error('boom');

    await reportUnhandledError(failure);

    expect(sentry.captureException).toHaveBeenCalledWith(failure);
    expect(sentry.flush).toHaveBeenCalledWith(2_000);
  });
});

describe('recordAttributesOnActiveSpan', () => {
  it('sets every field on the active span, a list as a copy the SDK may keep', () => {
    const failedParameters: readonly string[] = ['/talos/fire-url'];

    recordAttributesOnActiveSpan({
      'http.route': '/api/agent/sql',
      duration_ms: 12,
      'lambda.cold_start': false,
      'parameter_store.failed_parameters': failedParameters,
    });

    expect(requestSpan.setAttribute.mock.calls).toStrictEqual([
      ['http.route', '/api/agent/sql'],
      ['duration_ms', 12],
      ['lambda.cold_start', false],
      ['parameter_store.failed_parameters', ['/talos/fire-url']],
    ]);
    expect(requestSpan.setAttribute.mock.calls[3]?.[1]).not.toBe(failedParameters);
  });

  it('records nothing when no span is active', () => {
    sentry.getActiveSpan.mockReturnValueOnce(undefined);

    recordAttributesOnActiveSpan({ 'http.route': '/api/today' });

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
  const request = { method: 'POST', sentryTrace: SENTRY_TRACE, baggage: BAGGAGE };

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
    const answer = vi.fn(() => Promise.resolve({ route: '/api/agent/sql', status: 400 }));

    await traceIncomingRequest(request, answer);

    expect(sentry.continueTrace).toHaveBeenCalledWith(
      { sentryTrace: SENTRY_TRACE, baggage: BAGGAGE },
      expect.any(Function),
    );
    expect(sentry.startSpan).toHaveBeenCalledWith(
      {
        name: 'POST',
        op: 'http.server',
        forceTransaction: true,
        attributes: { 'http.request.method': 'POST' },
      },
      expect.any(Function),
    );
    expect(answer).toHaveBeenCalledOnce();
    expect(sentry.updateSpanName).toHaveBeenCalledWith(requestSpan, 'POST /api/agent/sql');
    expect(requestSpan.setAttribute).toHaveBeenCalledWith('http.route', '/api/agent/sql');
    expect(sentry.setHttpStatus).toHaveBeenCalledWith(requestSpan, 400);
    expect(sentry.flush).toHaveBeenCalledWith(2_000);
  });
});
