import { join } from 'node:path';
import type { BuildOptions } from 'esbuild';
import { buildSourceMapUploadCommands, type SourceMapUpload } from './source-map-upload.utils.js';

export interface HandlerBundleRequest {
  readonly entry: string;
  readonly outputDirectory: string;
  readonly sourceMapUpload?: SourceMapUpload | undefined;
}

export const BUNDLED_HANDLER = 'index.handler';

const BUNDLED_FILE_NAME = 'index.mjs';
const NODE_BUILTIN_REQUIRE_SHIM_BANNER =
  "import { createRequire } from 'module'; const require = createRequire(import.meta.url);";
const PACKAGES_THE_NODE_22_RUNTIME_PROVIDES = ['@aws-sdk/*'];
const NO_COMMANDS: readonly string[] = [];

// @FollowsBlueprint utils-pure-module
export function buildHandlerBuildOptions(request: HandlerBundleRequest): BuildOptions {
  return {
    entryPoints: [request.entry],
    outfile: join(request.outputDirectory, BUNDLED_FILE_NAME),
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    minify: true,
    sourcemap: true,
    mainFields: ['module', 'main'],
    banner: { js: NODE_BUILTIN_REQUIRE_SHIM_BANNER },
    external: PACKAGES_THE_NODE_22_RUNTIME_PROVIDES,
    logLevel: 'warning',
  };
}

export function buildHandlerBundlerArguments(
  bundlerScript: string,
  request: HandlerBundleRequest,
): readonly string[] {
  return [bundlerScript, JSON.stringify(buildHandlerBuildOptions(request))];
}

export function buildAfterBundlingCommands(request: HandlerBundleRequest): readonly string[] {
  if (request.sourceMapUpload === undefined) return NO_COMMANDS;
  return buildSourceMapUploadCommands(request.sourceMapUpload, request.outputDirectory);
}
