import { describe, expect, it } from 'vitest';
import { buildSourceMapUploadCommands } from './source-map-upload.utils.js';

const UPLOAD = { organization: 'borsofr', project: 'borso-fr', release: 'abc123' };

describe('buildSourceMapUploadCommands', () => {
  it('injects debug ids, then uploads and deletes the map only if the upload worked', () => {
    expect(buildSourceMapUploadCommands(UPLOAD, '/asset-output')).toEqual([
      "pnpm exec sentry-cli sourcemaps inject '/asset-output' || true",
      "pnpm exec sentry-cli sourcemaps upload --org 'borsofr' --project 'borso-fr' --release 'abc123' '/asset-output' && rm -f '/asset-output'/*.map || true",
    ]);
  });

  it('keeps the map when the upload fails, so a deploy never loses it everywhere at once', () => {
    const upload = buildSourceMapUploadCommands(UPLOAD, '/out').at(1) ?? '';
    expect(upload.indexOf('&& rm -f')).toBeGreaterThan(upload.indexOf('sourcemaps upload'));
    expect(upload.endsWith('|| true')).toBe(true);
  });

  it('lets a failed inject pass, because it is not worth a failed deploy', () => {
    expect(buildSourceMapUploadCommands(UPLOAD, '/out').at(0)?.endsWith('|| true')).toBe(true);
  });

  it('quotes a directory holding a space, which a checkout path may', () => {
    expect(buildSourceMapUploadCommands(UPLOAD, '/two words')).toEqual([
      "pnpm exec sentry-cli sourcemaps inject '/two words' || true",
      "pnpm exec sentry-cli sourcemaps upload --org 'borsofr' --project 'borso-fr' --release 'abc123' '/two words' && rm -f '/two words'/*.map || true",
    ]);
  });

  it('escapes a quote inside a value rather than ending the quoted word', () => {
    expect(
      buildSourceMapUploadCommands({ organization: "it's", project: 'p', release: 'r' }, '/out').at(
        1,
      ),
    ).toContain(`--org 'it'\\''s'`);
  });

  it('carries each upload field into the upload call', () => {
    expect(
      buildSourceMapUploadCommands(
        { organization: 'other-org', project: 'other-project', release: 'v9' },
        '/out',
      ).at(1),
    ).toBe(
      "pnpm exec sentry-cli sourcemaps upload --org 'other-org' --project 'other-project' --release 'v9' '/out' && rm -f '/out'/*.map || true",
    );
  });
});
