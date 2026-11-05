import { afterEach, describe, expect, it, vi } from 'vitest';
import { initSentry } from './sentry';

const sentry = vi.hoisted(() => ({ init: vi.fn(), addBreadcrumb: vi.fn() }));

const environment = vi.hoisted(() => ({
  readSentryDsn: vi.fn<() => string | undefined>(),
  readStageName: vi.fn<() => string | undefined>(),
}));

vi.mock('@sentry/react', () => sentry);
vi.mock('../lib/environment', () => environment);

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';

describe('initSentry', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts nothing when no project is configured', () => {
    environment.readSentryDsn.mockReturnValueOnce(undefined);

    initSentry();

    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('tags every event with the app in the shared project and the stage, with personal data off', () => {
    environment.readSentryDsn.mockReturnValueOnce(DSN);
    environment.readStageName.mockReturnValueOnce('preview');

    initSentry();

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'preview',
      initialScope: { tags: { app: 'last-loop-lepin' } },
      sendDefaultPii: false,
      tracesSampleRate: 0,
    });
  });
});
