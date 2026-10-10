import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportRenderFailure, startErrorReporting } from './error-reporting.adapter';

const ROUTER_TRACING = { name: 'reactRouterBrowserTracing' };

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureReactException: vi.fn(),
  reactRouterBrowserTracingIntegration: vi.fn(() => ROUTER_TRACING),
  wrapReactRouterRouting: vi.fn((routes: unknown) => routes),
}));

vi.mock('@sentry/react', () => sentry);

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';
const API_ONLY = /^https:\/\/pragma\.borso\.fr\/api\//;

describe('startErrorReporting', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts nothing when no project is configured', () => {
    startErrorReporting(undefined);

    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('starts route-named tracing that sends trace headers to the API only, with personal data off', () => {
    startErrorReporting({
      dsn: DSN,
      environment: 'prod',
      tracesSampleRate: 1,
      tracePropagationTargets: [API_ONLY],
    });

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'prod',
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
      },
      tracesSampleRate: 1,
      tracePropagationTargets: [API_ONLY],
      integrations: [ROUTER_TRACING],
    });
    expect(sentry.reactRouterBrowserTracingIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        useEffect: expect.any(Function),
        useLocation: expect.any(Function),
        useNavigationType: expect.any(Function),
        createRoutesFromChildren: expect.any(Function),
        matchRoutes: expect.any(Function),
      }),
    );
  });
});

describe('reportRenderFailure', () => {
  it('hands the failure and the component stack to the SDK', () => {
    const failure = new Error('render broke');

    reportRenderFailure(failure, '\n    at SongPage');

    expect(sentry.captureReactException).toHaveBeenCalledWith(failure, {
      componentStack: '\n    at SongPage',
    });
  });
});
