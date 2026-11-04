import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportUnhandledError, startErrorReporting } from './error-reporting.adapter';

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@sentry/aws-serverless', () => sentry);

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';

describe('startErrorReporting', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts nothing when no project is configured', () => {
    startErrorReporting(undefined);

    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('starts the SDK tagged with the app in the shared project, with every personal data category off', () => {
    startErrorReporting({ dsn: DSN, environment: 'prod' });

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'prod',
      initialScope: { tags: { app: 'last-loop-lepin' } },
      tracesSampleRate: 0,
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
    });
  });
});

describe('reportUnhandledError', () => {
  it('hands the failure to the SDK and waits for it to be sent before the Lambda freezes', async () => {
    const failure = new Error('boom');

    await reportUnhandledError(failure);

    expect(sentry.captureException).toHaveBeenCalledWith(failure);
    expect(sentry.flush).toHaveBeenCalledWith(2_000);
  });
});
