import { describe, expect, it } from 'vitest';
import { selectErrorReportingSettings, selectRouteName } from './error-reporting.core';

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';
const RELEASE = '0123abcd';

describe('selectErrorReportingSettings', () => {
  it('reports and traces every request from a deployed stage, with the release attached', () => {
    expect(selectErrorReportingSettings({ dsn: DSN, stage: 'prod', release: RELEASE })).toEqual({
      dsn: DSN,
      environment: 'prod',
      tracesSampleRate: 1,
      release: RELEASE,
    });
  });

  it.each(['preview', 'integ'])('reports from the %s stage', (stage) => {
    expect(selectErrorReportingSettings({ dsn: DSN, stage, release: RELEASE })?.environment).toBe(
      stage,
    );
  });

  it('leaves the release out when none was given', () => {
    expect(
      selectErrorReportingSettings({ dsn: DSN, stage: 'prod', release: undefined }),
    ).toStrictEqual({
      dsn: DSN,
      environment: 'prod',
      tracesSampleRate: 1,
    });
  });

  it('stays off when no project is configured', () => {
    expect(
      selectErrorReportingSettings({ dsn: undefined, stage: 'prod', release: RELEASE }),
    ).toBeUndefined();
  });

  it.each(['dev', 'test', undefined])('stays off on the %s stage', (stage) => {
    expect(selectErrorReportingSettings({ dsn: DSN, stage, release: RELEASE })).toBeUndefined();
  });
});

describe('selectRouteName', () => {
  it('names the request after the last route handler, skipping the middleware around it', () => {
    expect(
      selectRouteName([
        { method: 'ALL', path: '*' },
        { method: 'GET', path: '/api/*' },
        { method: 'GET', path: '/api/songs/*' },
        { method: 'GET', path: '/api/songs/:songId' },
        { method: 'ALL', path: '/api/songs/:songId' },
      ]),
    ).toBe('/api/songs/:songId');
  });

  it('names a request no handler matched without echoing its path', () => {
    expect(selectRouteName([{ method: 'ALL', path: '*' }])).toBe('unmatched route');
  });
});
