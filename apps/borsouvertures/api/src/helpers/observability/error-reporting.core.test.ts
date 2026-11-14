import { describe, expect, it } from 'vitest';
import { selectApiErrorReportingSettings } from './error-reporting.core';

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';
const RELEASE = '0123abcd';

// @FollowsBlueprint test-pure-unit
describe('selectApiErrorReportingSettings', () => {
  it.each(['prod', 'preview'] as const)(
    'reports and traces every request to the %s environment under the deployed release',
    (stage) => {
      expect(selectApiErrorReportingSettings({ dsn: DSN, stage, release: RELEASE })).toEqual({
        dsn: DSN,
        environment: stage,
        tracesSampleRate: 1,
        release: RELEASE,
      });
    },
  );

  it.each([undefined, ''])('leaves the release to the SDK when it is %j', (release) => {
    expect(selectApiErrorReportingSettings({ dsn: DSN, stage: 'prod', release })).toStrictEqual({
      dsn: DSN,
      environment: 'prod',
      tracesSampleRate: 1,
    });
  });

  it.each([undefined, '', 1])('reports nothing when the DSN is %j', (dsn) => {
    expect(
      selectApiErrorReportingSettings({ dsn, stage: 'prod', release: RELEASE }),
    ).toBeUndefined();
  });

  it.each([undefined, 'dev', 'integ', ''])('reports nothing from the %j stage', (stage) => {
    expect(selectApiErrorReportingSettings({ dsn: DSN, stage, release: RELEASE })).toBeUndefined();
  });
});
