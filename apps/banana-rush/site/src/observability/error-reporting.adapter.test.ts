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

  it('tags every event with the app and turns every personal data category off', () => {
    startErrorReporting({ dsn: DSN, environment: 'prod' });

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'prod',
      initialScope: { tags: { app: 'banana-rush' } },
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
  it('reports the render failure with the component stack React gave', () => {
    const failure = new Error('render failed');

    reportRenderFailure(failure, '\n    at GameBoard');

    expect(sentry.captureReactException).toHaveBeenCalledWith(failure, {
      componentStack: '\n    at GameBoard',
    });
  });
});
