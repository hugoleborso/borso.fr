import { afterEach, describe, expect, it, vi } from 'vitest';
import { startErrorReporting } from './error-reporting.adapter';

const browserTracing = vi.hoisted(() => ({ name: 'BrowserTracing' }));

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(() => browserTracing),
}));

vi.mock('@sentry/react', () => sentry);

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';

describe('startErrorReporting', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reports errors tagged with the app, traces every page load, with personal data off and no trace header sent', () => {
    startErrorReporting({ dsn: DSN, environment: 'prod', tracesSampleRate: 1 });

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'prod',
      initialScope: { tags: { app: 'borso-fr' } },
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
      },
      tracesSampleRate: 1,
      tracePropagationTargets: [],
      integrations: [browserTracing],
    });
  });
});
