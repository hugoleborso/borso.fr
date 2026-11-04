import { describe, expect, it } from 'vitest';
import { selectErrorReportingSettings } from './error-reporting.core';

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';

describe('selectErrorReportingSettings', () => {
  it.each(['prod', 'preview'] as const)(
    'reports to the %s environment when a DSN is set',
    (stage) => {
      expect(selectErrorReportingSettings({ dsn: DSN, stage })).toEqual({
        dsn: DSN,
        environment: stage,
      });
    },
  );

  it.each([undefined, ''])('reports nothing when the DSN is %j', (dsn) => {
    expect(selectErrorReportingSettings({ dsn, stage: 'prod' })).toBeUndefined();
  });

  it('reports nothing when the DSN is not text', () => {
    expect(selectErrorReportingSettings({ dsn: 1, stage: 'prod' })).toBeUndefined();
  });

  it.each([undefined, 'dev', 'integ', ''])('reports nothing from the %j stage', (stage) => {
    expect(selectErrorReportingSettings({ dsn: DSN, stage })).toBeUndefined();
  });
});
