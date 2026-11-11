import { describe, expect, it } from 'vitest';
import {
  selectBrowserReportingSettings,
  selectErrorReportingSettings,
  selectTracePropagationTargets,
} from './error-reporting.core';

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';
const RELEASE = '0123abcd';
const PROD_ORIGIN = 'https://banana-rush.borso.fr';
const PREVIEW_ORIGIN = 'https://banana-rush-pr-7.preview.borso.fr';
const PREVIEW_API = 'https://banana-rush-pr-7-api.preview.borso.fr';

function isMatchedByAny(targets: readonly RegExp[], url: string): boolean {
  return targets.some((target) => target.test(url));
}

describe('selectErrorReportingSettings', () => {
  it.each(['prod', 'preview'] as const)(
    'reports and traces every request to the %s environment under the deployed release',
    (stage) => {
      expect(selectErrorReportingSettings({ dsn: DSN, stage, release: RELEASE })).toEqual({
        dsn: DSN,
        environment: stage,
        tracesSampleRate: 1,
        release: RELEASE,
      });
    },
  );

  it.each([undefined, ''])('leaves the release to the SDK when it is %j', (release) => {
    expect(selectErrorReportingSettings({ dsn: DSN, stage: 'prod', release })).toStrictEqual({
      dsn: DSN,
      environment: 'prod',
      tracesSampleRate: 1,
    });
  });

  it.each([undefined, ''])('reports nothing when the DSN is %j', (dsn) => {
    expect(selectErrorReportingSettings({ dsn, stage: 'prod', release: RELEASE })).toBeUndefined();
  });

  it('reports nothing when the DSN is not text', () => {
    expect(
      selectErrorReportingSettings({ dsn: 1, stage: 'prod', release: RELEASE }),
    ).toBeUndefined();
  });

  it.each([undefined, 'dev', 'integ', ''])('reports nothing from the %j stage', (stage) => {
    expect(selectErrorReportingSettings({ dsn: DSN, stage, release: RELEASE })).toBeUndefined();
  });
});

describe('selectBrowserReportingSettings', () => {
  it.each(['prod', 'preview'] as const)(
    'reports and traces from the %s stage, sending trace headers to the API only',
    (stage) => {
      expect(
        selectBrowserReportingSettings({ dsn: DSN, stage, apiBase: '', pageOrigin: PROD_ORIGIN }),
      ).toEqual({
        dsn: DSN,
        environment: stage,
        tracesSampleRate: 1,
        tracePropagationTargets: [/^https:\/\/banana-rush\.borso\.fr\/api\//],
      });
    },
  );

  it.each([undefined, '', 42])('stays off when the DSN is %j', (dsn) => {
    expect(
      selectBrowserReportingSettings({ dsn, stage: 'prod', apiBase: '', pageOrigin: PROD_ORIGIN }),
    ).toBeUndefined();
  });

  it.each([undefined, 'dev', 'integ'])('stays off on the %j stage', (stage) => {
    expect(
      selectBrowserReportingSettings({ dsn: DSN, stage, apiBase: '', pageOrigin: PROD_ORIGIN }),
    ).toBeUndefined();
  });
});

describe('selectTracePropagationTargets', () => {
  it('sends trace headers to the API on the page origin when no API base is configured', () => {
    const targets = selectTracePropagationTargets(undefined, PROD_ORIGIN);

    expect(isMatchedByAny(targets, `${PROD_ORIGIN}/api/games/ABCD`)).toBe(true);
    expect(isMatchedByAny(targets, `${PROD_ORIGIN}/assets/index.js`)).toBe(false);
    expect(isMatchedByAny(targets, 'https://banana-rush.borso.fr.attacker.example/api/games')).toBe(
      false,
    );
  });

  it('sends trace headers to the separate API host of a preview, and nowhere else', () => {
    const targets = selectTracePropagationTargets(`${PREVIEW_API}/`, PREVIEW_ORIGIN);

    expect(isMatchedByAny(targets, `${PREVIEW_API}/api/games`)).toBe(true);
    expect(isMatchedByAny(targets, `${PREVIEW_ORIGIN}/api/games`)).toBe(false);
    expect(isMatchedByAny(targets, 'wss://socket.example/api/games')).toBe(false);
  });
});
