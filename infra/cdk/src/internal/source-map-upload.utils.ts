import type { BundlingOptions, ICommandHooks } from 'aws-cdk-lib/aws-lambda-nodejs';
import { OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';

export interface SourceMapUpload {
  readonly organization: string;
  readonly project: string;
  readonly release: string;
}

const SENTRY_CLI = 'pnpm exec sentry-cli';
const NODE_BUILTIN_REQUIRE_SHIM_BANNER =
  "import { createRequire } from 'module'; const require = createRequire(import.meta.url);";

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export function buildSourceMapUploadCommands(
  upload: SourceMapUpload,
  outputDirectory: string,
): readonly string[] {
  const directory = shellQuote(outputDirectory);
  const target = `--org ${shellQuote(upload.organization)} --project ${shellQuote(upload.project)} --release ${shellQuote(upload.release)}`;
  return [
    `${SENTRY_CLI} sourcemaps inject ${directory} || true`,
    `${SENTRY_CLI} sourcemaps upload ${target} ${directory} && rm -f ${directory}/*.map || true`,
  ];
}

export function buildSourceMapUploadHooks(upload: SourceMapUpload): ICommandHooks {
  return {
    beforeBundling: () => [],
    beforeInstall: () => [],
    afterBundling: (_inputDirectory: string, outputDirectory: string) => [
      ...buildSourceMapUploadCommands(upload, outputDirectory),
    ],
  };
}

export function buildHandlerBundling(upload: SourceMapUpload | undefined): BundlingOptions {
  return {
    minify: true,
    sourceMap: true,
    target: 'node22',
    format: OutputFormat.ESM,
    mainFields: ['module', 'main'],
    banner: NODE_BUILTIN_REQUIRE_SHIM_BANNER,
    ...(upload === undefined ? {} : { commandHooks: buildSourceMapUploadHooks(upload) }),
  };
}
