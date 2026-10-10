import { describe, expect, it } from 'vitest';
import {
  selectErrorReportingSettings,
  selectTracePropagationTargets,
} from './error-reporting.core';

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';
const PROD_ORIGIN = 'https://pragma.borso.fr';
const PREVIEW_ORIGIN = 'https://pragma-pr-7.preview.borso.fr';
const PREVIEW_API = 'https://pragma-pr-7-api.preview.borso.fr';

function isMatchedByAny(targets: readonly RegExp[], url: string): boolean {
  return targets.some((target) => target.test(url));
}

describe('selectErrorReportingSettings', () => {
  it.each(['preview', 'integ', 'prod'])('reports and traces from the %s stage', (stage) => {
    expect(
      selectErrorReportingSettings({ dsn: DSN, stage, apiBase: '', pageOrigin: PROD_ORIGIN }),
    ).toEqual({
      dsn: DSN,
      environment: stage,
      tracesSampleRate: 1,
      tracePropagationTargets: [/^https:\/\/pragma\.borso\.fr\/api\//],
    });
  });

  it.each([undefined, '', 42])('stays off when the project address is %s', (dsn) => {
    expect(
      selectErrorReportingSettings({ dsn, stage: 'prod', apiBase: '', pageOrigin: PROD_ORIGIN }),
    ).toBeUndefined();
  });

  it.each([undefined, 'dev', 'test'])('stays off on the %s stage', (stage) => {
    expect(
      selectErrorReportingSettings({ dsn: DSN, stage, apiBase: '', pageOrigin: PROD_ORIGIN }),
    ).toBeUndefined();
  });
});

describe('selectTracePropagationTargets', () => {
  it('sends trace headers to the API on the page origin when no API base is configured', () => {
    const targets = selectTracePropagationTargets(undefined, PROD_ORIGIN);

    expect(isMatchedByAny(targets, `${PROD_ORIGIN}/api/songs?search=x`)).toBe(true);
    expect(isMatchedByAny(targets, `${PROD_ORIGIN}/assets/index.js`)).toBe(false);
    expect(isMatchedByAny(targets, 'https://pragma.borso.fr.attacker.example/api/songs')).toBe(
      false,
    );
  });

  it('sends trace headers to the separate API host of a preview, and nowhere else', () => {
    const targets = selectTracePropagationTargets(`${PREVIEW_API}/`, PREVIEW_ORIGIN);

    expect(isMatchedByAny(targets, `${PREVIEW_API}/api/setlists`)).toBe(true);
    expect(isMatchedByAny(targets, `${PREVIEW_ORIGIN}/api/setlists`)).toBe(false);
    expect(
      isMatchedByAny(targets, 'https://pragma-prod-uploads.s3.eu-west-3.amazonaws.com/x'),
    ).toBe(false);
    expect(isMatchedByAny(targets, 'https://api.deezer.com/api/search')).toBe(false);
  });
});
