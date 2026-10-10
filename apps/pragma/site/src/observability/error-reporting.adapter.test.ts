import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportRenderFailure, startErrorReporting } from './error-reporting.adapter';

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureReactException: vi.fn(),
}));

vi.mock('@sentry/react', () => sentry);

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
    startErrorReporting({ dsn: DSN, environment: 'prod' });

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
    });
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
