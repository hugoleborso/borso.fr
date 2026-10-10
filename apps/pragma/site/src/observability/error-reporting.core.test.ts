import { describe, expect, it } from 'vitest';
import { selectErrorReportingSettings } from './error-reporting.core';

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';

describe('selectErrorReportingSettings', () => {
  it.each(['preview', 'integ', 'prod'])('reports from the %s stage', (stage) => {
    expect(selectErrorReportingSettings({ dsn: DSN, stage })).toEqual({
      dsn: DSN,
      environment: stage,
    });
  });

  it.each([undefined, '', 42])('stays off when the project address is %s', (dsn) => {
    expect(selectErrorReportingSettings({ dsn, stage: 'prod' })).toBeUndefined();
  });

  it.each([undefined, 'dev', 'test'])('stays off on the %s stage', (stage) => {
    expect(selectErrorReportingSettings({ dsn: DSN, stage })).toBeUndefined();
  });
});
