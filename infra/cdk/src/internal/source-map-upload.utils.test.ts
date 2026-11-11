import { describe, expect, it } from 'vitest';
import {
  buildSourceMapUploadCommands,
  buildSourceMapUploadHooks,
} from './source-map-upload.utils.js';

const UPLOAD = { organization: 'borsofr', project: 'borso-fr', release: 'abc123' };

describe('buildSourceMapUploadCommands', () => {
  it('injects debug ids, uploads under the release, then deletes every map', () => {
    expect(buildSourceMapUploadCommands(UPLOAD, '/asset-output')).toEqual([
      'pnpm exec sentry-cli sourcemaps inject /asset-output || true',
      'pnpm exec sentry-cli sourcemaps upload --org borsofr --project borso-fr --release abc123 /asset-output || true',
      'rm -f /asset-output/*.map',
    ]);
  });

  it('lets either sentry-cli call fail without failing the deploy, and deletes the map anyway', () => {
    const commands = buildSourceMapUploadCommands(UPLOAD, '/out');
    expect(commands.at(0)?.endsWith('|| true')).toBe(true);
    expect(commands.at(1)?.endsWith('|| true')).toBe(true);
    expect(commands.at(2)).toBe('rm -f /out/*.map');
  });

  it('names the directory it was given in every command', () => {
    expect(buildSourceMapUploadCommands(UPLOAD, '/elsewhere')).toEqual([
      'pnpm exec sentry-cli sourcemaps inject /elsewhere || true',
      'pnpm exec sentry-cli sourcemaps upload --org borsofr --project borso-fr --release abc123 /elsewhere || true',
      'rm -f /elsewhere/*.map',
    ]);
  });

  it('carries each upload field into the upload call', () => {
    expect(
      buildSourceMapUploadCommands(
        { organization: 'other-org', project: 'other-project', release: 'v9' },
        '/out',
      ).at(1),
    ).toBe(
      'pnpm exec sentry-cli sourcemaps upload --org other-org --project other-project --release v9 /out || true',
    );
  });
});

describe('buildSourceMapUploadHooks', () => {
  it('adds nothing before the install or the bundling', () => {
    const hooks = buildSourceMapUploadHooks(UPLOAD);
    expect(hooks.beforeInstall('/in', '/out')).toEqual([]);
    expect(hooks.beforeBundling('/in', '/out')).toEqual([]);
  });

  it('runs the upload commands after the bundling, against the output directory', () => {
    const hooks = buildSourceMapUploadHooks(UPLOAD);
    expect(hooks.afterBundling('/in', '/out')).toEqual(
      buildSourceMapUploadCommands(UPLOAD, '/out'),
    );
    expect(hooks.afterBundling('/in', '/out').at(2)).toBe('rm -f /out/*.map');
  });
});
