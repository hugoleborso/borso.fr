import { withoutPrivateContent } from '@domain/error-reporting.core';
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

  it('starts errors-only reporting tagged talos, with every data category, breadcrumb and request field off', () => {
    startErrorReporting({ dsn: DSN, environment: 'prod' });

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'prod',
      initialScope: { tags: { app: 'talos' } },
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        databaseQueryData: false,
        stackFrameVariables: false,
        queues: false,
        graphQL: { document: false, variables: false },
        genAI: { inputs: false, outputs: false },
        frameContextLines: 0,
      },
      maxBreadcrumbs: 0,
      tracePropagationTargets: [],
      beforeSend: withoutPrivateContent,
    });
  });
});

describe('reportUnhandledError', () => {
  it('hands the failure to the SDK and waits for it to leave before the Lambda freezes', async () => {
    const failure = new Error('boom');

    await reportUnhandledError(failure);

    expect(sentry.captureException).toHaveBeenCalledWith(failure);
    expect(sentry.flush).toHaveBeenCalledWith(2_000);
  });
});
