import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameError } from '../errors/game-error.types';
import {
  reportHandlerFailures,
  reportUnexpectedFailure,
  startErrorReporting,
} from './error-reporting.adapter';

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  wrapHandler: vi.fn(),
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

  it('tags every event with the app and turns every personal data category off', () => {
    startErrorReporting({ dsn: DSN, environment: 'preview' });

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'preview',
      initialScope: { tags: { app: 'banana-rush' } },
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

describe('reportUnexpectedFailure', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reports a failure the application did not name', () => {
    const failure = new Error('connection reset');

    reportUnexpectedFailure(failure);

    expect(sentry.captureException).toHaveBeenCalledWith(failure);
  });

  it('keeps a named refusal out of the reports, since the player was answered with it', () => {
    reportUnexpectedFailure(new GameError('game-full'));

    expect(sentry.captureException).not.toHaveBeenCalled();
  });
});

describe('reportHandlerFailures', () => {
  it('is the vendor wrapper that reports a thrown handler failure and flushes before the Lambda freezes', () => {
    expect(reportHandlerFailures).toBe(sentry.wrapHandler);
  });
});
