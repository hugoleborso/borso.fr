import type { ICommandHooks } from 'aws-cdk-lib/aws-lambda-nodejs';

export interface SourceMapUpload {
  readonly organization: string;
  readonly project: string;
  readonly release: string;
}

const SENTRY_CLI = 'pnpm exec sentry-cli';

export function buildSourceMapUploadCommands(
  upload: SourceMapUpload,
  outputDirectory: string,
): readonly string[] {
  return [
    `${SENTRY_CLI} sourcemaps inject ${outputDirectory} || true`,
    `${SENTRY_CLI} sourcemaps upload --org ${upload.organization} --project ${upload.project} --release ${upload.release} ${outputDirectory} || true`,
    `rm -f ${outputDirectory}/*.map`,
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
