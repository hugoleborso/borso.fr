import { afterEach, describe, expect, it, vi } from 'vitest';
import { startErrorReporting } from './error-reporting.adapter';

const sentry = vi.hoisted(() => ({ init: vi.fn() }));

vi.mock('@sentry/react', () => sentry);

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';

describe('startErrorReporting', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reports errors tagged with the app, with personal data off and no tracing', () => {
    startErrorReporting({ dsn: DSN, environment: 'prod' });

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'prod',
      initialScope: { tags: { app: 'borsouvertures' } },
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
      },
    });
  });
});
