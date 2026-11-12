import { describe, expect, it } from 'vitest';
import {
  selectBrowserReportingSettings,
  selectErrorReportingSettings,
  selectTracePropagationTargets,
  withoutPrivateContent,
} from './error-reporting.core';

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';
const RELEASE = '0123abcd';
const PAGE_ORIGIN = 'https://talos.borso.fr';

function isMatchedByAny(targets: readonly RegExp[], url: string): boolean {
  return targets.some((target) => target.test(url));
}

describe('selectErrorReportingSettings', () => {
  it('reports and traces every request as prod, the only stage talos has, with the release attached', () => {
    expect(selectErrorReportingSettings({ dsn: DSN, release: RELEASE })).toStrictEqual({
      dsn: DSN,
      environment: 'prod',
      tracesSampleRate: 1,
      release: RELEASE,
    });
  });

  it.each([undefined, ''])('leaves the release out when it is %s', (release) => {
    expect(selectErrorReportingSettings({ dsn: DSN, release })).toStrictEqual({
      dsn: DSN,
      environment: 'prod',
      tracesSampleRate: 1,
    });
  });

  it.each([undefined, '', 42])('stays off when the project address is %s', (dsn) => {
    expect(selectErrorReportingSettings({ dsn, release: RELEASE })).toBeUndefined();
  });
});

describe('selectTracePropagationTargets', () => {
  it('sends trace headers to the API on the page origin, and nowhere else', () => {
    const targets = selectTracePropagationTargets(PAGE_ORIGIN);

    expect(isMatchedByAny(targets, `${PAGE_ORIGIN}/api/agent/sql`)).toBe(true);
    expect(isMatchedByAny(targets, `${PAGE_ORIGIN}/assets/index.js`)).toBe(false);
    expect(isMatchedByAny(targets, 'https://talos.borso.fr.attacker.example/api/today')).toBe(
      false,
    );
    expect(isMatchedByAny(targets, 'https://talosxborso.fr/api/today')).toBe(false);
  });
});

describe('selectBrowserReportingSettings', () => {
  it('traces page loads and sends trace headers to the API only, with no release', () => {
    expect(selectBrowserReportingSettings({ dsn: DSN, pageOrigin: PAGE_ORIGIN })).toStrictEqual({
      dsn: DSN,
      environment: 'prod',
      tracesSampleRate: 1,
      tracePropagationTargets: [/^https:\/\/talos\.borso\.fr\/api\//],
    });
  });

  it('stays off when no project is configured', () => {
    expect(
      selectBrowserReportingSettings({ dsn: undefined, pageOrigin: PAGE_ORIGIN }),
    ).toBeUndefined();
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
