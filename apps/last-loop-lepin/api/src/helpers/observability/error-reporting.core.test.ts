import { describe, expect, it } from 'vitest';
import { selectErrorReportingSettings } from './error-reporting.core';

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';

describe('selectErrorReportingSettings', () => {
  it.each(['preview', 'integ', 'prod'])('reports from the %s stage under its name', (stage) => {
    expect(selectErrorReportingSettings({ dsn: DSN, stage })).toStrictEqual({
      dsn: DSN,
      environment: stage,
    });
  });

  it('stays off when no project is configured', () => {
    expect(selectErrorReportingSettings({ dsn: undefined, stage: 'prod' })).toBeUndefined();
  });

  it.each(['dev', 'test', undefined])('stays off on the %s stage', (stage) => {
    expect(selectErrorReportingSettings({ dsn: DSN, stage })).toBeUndefined();
  });
});
