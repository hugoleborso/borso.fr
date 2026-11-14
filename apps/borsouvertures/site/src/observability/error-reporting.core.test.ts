import { describe, expect, it } from 'vitest';
import { readErrorTags, selectErrorReportingSettings } from './error-reporting.core';

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';

describe('selectErrorReportingSettings', () => {
  it.each(['preview', 'prod'])('reports from the %s stage', (stage) => {
    expect(selectErrorReportingSettings({ dsn: DSN, stage })).toEqual({
      dsn: DSN,
      environment: stage,
      tracesSampleRate: 1,
    });
  });

  it.each([undefined, '', 42])('stays off when the project address is %s', (dsn) => {
    expect(selectErrorReportingSettings({ dsn, stage: 'prod' })).toBeUndefined();
  });

  it.each([undefined, 'dev', 'integ'])('stays off on the %s stage', (stage) => {
    expect(selectErrorReportingSettings({ dsn: DSN, stage })).toBeUndefined();
  });
});

describe('readErrorTags', () => {
  it('reads the text tags a named error carries', () => {
    const error = Object.assign(new Error('store'), { tags: { operation: 'write', attempt: 2 } });
    expect(readErrorTags({ tags: { operation: 'write', deckId: 'albin' } })).toEqual({
      operation: 'write',
      deckId: 'albin',
    });
    expect(readErrorTags({ tags: { operation: 'write', attempt: 2 } })).toEqual({
      operation: 'write',
    });
    expect(readErrorTags(error)).toEqual({ operation: 'write' });
  });

  it('answers no tag for anything else', () => {
    expect(readErrorTags(new Error('plain'))).toEqual({});
    expect(readErrorTags({ tags: 'operation' })).toEqual({});
    expect(readErrorTags({ tags: ['operation'] })).toEqual({});
    expect(readErrorTags(null)).toEqual({});
    expect(readErrorTags('error')).toEqual({});
    expect(readErrorTags([{ tags: { operation: 'write' } }])).toEqual({});
  });
});
