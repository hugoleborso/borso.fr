import { describe, expect, it } from 'vitest';
import { selectErrorReportingSettings, withoutPrivateContent } from './error-reporting.core';

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';

describe('selectErrorReportingSettings', () => {
  it('reports to the configured project as prod, the only stage talos has', () => {
    expect(selectErrorReportingSettings(DSN)).toEqual({ dsn: DSN, environment: 'prod' });
  });

  it.each([undefined, '', 42])('stays off when the project address is %s', (dsn) => {
    expect(selectErrorReportingSettings(dsn)).toBeUndefined();
  });
});

describe('withoutPrivateContent', () => {
  it('drops the request, the user, the breadcrumbs and the extra data, and keeps the failure', () => {
    const exception = { values: [{ type: 'Error', value: 'boom' }] };

    expect(
      withoutPrivateContent({
        exception,
        tags: { app: 'talos' },
        request: { url: 'https://talos.borso.fr/pages/private', data: '{"text":"secret"}' },
        user: { ip_address: '192.0.2.1' },
        breadcrumbs: [{ message: 'GET /api/pages/private' }],
        extra: { body: 'secret' },
      }),
    ).toStrictEqual({ exception, tags: { app: 'talos' } });
  });
});
