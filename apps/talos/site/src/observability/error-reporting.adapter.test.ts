import { withoutPrivateContent } from '@domain/error-reporting.core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startErrorReporting } from './error-reporting.adapter';

const sentry = vi.hoisted(() => ({ init: vi.fn() }));

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
      },
      maxBreadcrumbs: 0,
      tracePropagationTargets: [],
      beforeSend: withoutPrivateContent,
    });
  });
});
