import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportUnhandledError, startErrorReporting } from './error-reporting.adapter';

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  isInitialized: vi.fn(() => false),
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

  it('starts the SDK with every personal data category switched off', () => {
    startErrorReporting({ dsn: DSN, environment: 'prod', release: 'abc123' });

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'prod',
      release: 'abc123',
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

  it('leaves the release to the SDK when none was given', () => {
    startErrorReporting({ dsn: DSN, environment: 'preview' });

    expect(sentry.init.mock.calls[0]?.[0]).not.toHaveProperty('release');
  });
});

describe('reportUnhandledError', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing while reporting is off', async () => {
    sentry.isInitialized.mockReturnValueOnce(false);

    await reportUnhandledError(new Error('boom'));

    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(sentry.flush).not.toHaveBeenCalled();
  });

  it('captures the failure and waits for it to leave before the Lambda freezes', async () => {
    sentry.isInitialized.mockReturnValueOnce(true);
    const failure = new Error('boom');

    await reportUnhandledError(failure);

    expect(sentry.captureException).toHaveBeenCalledWith(failure);
    expect(sentry.flush).toHaveBeenCalledWith(2_000);
  });
});
