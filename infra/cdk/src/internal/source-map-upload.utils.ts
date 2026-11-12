export interface SourceMapUpload {
  readonly organization: string;
  readonly project: string;
  readonly release: string;
}

const SENTRY_CLI = 'pnpm exec sentry-cli';

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
