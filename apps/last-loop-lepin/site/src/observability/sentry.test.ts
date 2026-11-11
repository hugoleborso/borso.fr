import { afterEach, describe, expect, it, vi } from 'vitest';
import { initSentry } from './sentry';

const BROWSER_TRACING = { name: 'BrowserTracing' };

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  addBreadcrumb: vi.fn(),
  browserTracingIntegration: vi.fn(() => BROWSER_TRACING),
}));

const environment = vi.hoisted(() => ({
  readApiBaseSetting: vi.fn<() => unknown>(),
  readSentryDsn: vi.fn<() => string | undefined>(),
  readStageName: vi.fn<() => string | undefined>(),
}));

vi.mock('@sentry/react', () => sentry);
vi.mock('../lib/environment', () => environment);

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';
const PREVIEW_API = 'https://last-loop-lepin-pr-7-api.preview.borso.fr';

describe('initSentry', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts nothing when no project is configured', () => {
    environment.readSentryDsn.mockReturnValueOnce(undefined);

    initSentry();

    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('traces every page load, sends trace headers to the API only, and tags events with the app and the stage, with personal data off', () => {
    environment.readSentryDsn.mockReturnValueOnce(DSN);
    environment.readStageName.mockReturnValueOnce('preview');
    environment.readApiBaseSetting.mockReturnValueOnce(`${PREVIEW_API}/`);

    initSentry();

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'preview',
      initialScope: { tags: { app: 'last-loop-lepin' } },
      sendDefaultPii: false,
      tracesSampleRate: 1,
      tracePropagationTargets: [/^https:\/\/last-loop-lepin-pr-7-api\.preview\.borso\.fr\/api\//],
      integrations: [BROWSER_TRACING],
    });
  });
});
