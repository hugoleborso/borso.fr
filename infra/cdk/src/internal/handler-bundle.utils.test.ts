import { describe, expect, it } from 'vitest';
import {
  BUNDLED_HANDLER,
  buildAfterBundlingCommands,
  buildHandlerBuildOptions,
  buildHandlerBundlerArguments,
} from './handler-bundle.utils.js';
import { buildSourceMapUploadCommands } from './source-map-upload.utils.js';

const UPLOAD = { organization: 'borsofr', project: 'pragma', release: 'abc123' };
const REQUEST = { entry: '/repo/apps/pragma/api/src/main.ts', outputDirectory: '/asset-output' };

const BANNER =
  "import { createRequire } from 'module'; const require = createRequire(import.meta.url);";

describe('buildHandlerBuildOptions', () => {
  it('bundles one minified ESM file for Node 22 with its map, leaving the SDK the runtime provides', () => {
    expect(buildHandlerBuildOptions(REQUEST)).toEqual({
      entryPoints: ['/repo/apps/pragma/api/src/main.ts'],
      outfile: '/asset-output/index.mjs',
      bundle: true,
      platform: 'node',
      target: 'node22',
      format: 'esm',
      minify: true,
      sourcemap: true,
      mainFields: ['module', 'main'],
      banner: { js: BANNER },
      external: ['@aws-sdk/*'],
      logLevel: 'warning',
    });
  });

  it('builds the same bundle whether or not its map is uploaded', () => {
    expect(buildHandlerBuildOptions({ ...REQUEST, sourceMapUpload: UPLOAD })).toEqual(
      buildHandlerBuildOptions(REQUEST),
    );
  });

  it('names the handler export of the file it writes', () => {
    expect(BUNDLED_HANDLER).toBe('index.handler');
  });
});

describe('buildHandlerBundlerArguments', () => {
  it('passes the script first and the build options as one JSON argument', () => {
    const [script, serializedOptions, ...rest] = buildHandlerBundlerArguments(
      '/bundler.mjs',
      REQUEST,
    );
    expect(script).toBe('/bundler.mjs');
    expect(JSON.parse(serializedOptions ?? '')).toEqual(buildHandlerBuildOptions(REQUEST));
    expect(rest).toEqual([]);
  });
});

describe('buildAfterBundlingCommands', () => {
  it('runs nothing after the bundle when no upload target is given', () => {
    expect(buildAfterBundlingCommands(REQUEST)).toEqual([]);
  });

  it('uploads the map from the output directory when a target is given', () => {
    expect(buildAfterBundlingCommands({ ...REQUEST, sourceMapUpload: UPLOAD })).toEqual(
      buildSourceMapUploadCommands(UPLOAD, '/asset-output'),
    );
  });
});
