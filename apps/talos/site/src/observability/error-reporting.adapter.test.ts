import { withoutPrivateContent } from '@domain/error-reporting.core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startErrorReporting } from './error-reporting.adapter';

const ROUTER_TRACING = { name: 'reactRouterBrowserTracing' };

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  reactRouterBrowserTracingIntegration: vi.fn(() => ROUTER_TRACING),
  wrapReactRouterRouting: vi.fn((routes: unknown) => routes),
}));

vi.mock('@sentry/react', () => sentry);

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';
const API_ONLY = /^https:\/\/talos\.borso\.fr\/api\//;

function displayStandalone(isStandalone: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: isStandalone && query === '(display-mode: standalone)',
  }));
}

describe('startErrorReporting', () => {
  beforeEach(() => {
    displayStandalone(false);
  });

  it('tags an app opened from the home screen as standalone', () => {
    displayStandalone(true);
    startErrorReporting({
      dsn: DSN,
      environment: 'prod',
      tracesSampleRate: 1,
      tracePropagationTargets: [],
    });

    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        initialScope: { tags: { app: 'talos', 'display.mode': 'standalone' } },
      }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts nothing when no project is configured', () => {
    startErrorReporting(undefined);

    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('starts route-named tracing that sends trace headers to the API only, with every data category, breadcrumb and request field off', () => {
    startErrorReporting({
      dsn: DSN,
      environment: 'prod',
      tracesSampleRate: 1,
      tracePropagationTargets: [API_ONLY],
    });

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'prod',
      initialScope: { tags: { app: 'talos', 'display.mode': 'browser' } },
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: { allow: ['User-Agent'] },
        httpBodies: [],
        urlQueryParams: false,
      },
      maxBreadcrumbs: 0,
      tracesSampleRate: 1,
      tracePropagationTargets: [API_ONLY],
      integrations: [ROUTER_TRACING],
      beforeSend: withoutPrivateContent,
    });
    expect(sentry.reactRouterBrowserTracingIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        useLocation: expect.any(Function),
        useNavigationType: expect.any(Function),
        createRoutesFromChildren: expect.any(Function),
        matchRoutes: expect.any(Function),
      }),
    );
  });
});
