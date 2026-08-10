/**
 * Every `import.meta.env` read this site makes.
 *
 * Vite replaces `import.meta.env.<NAME>` at build time, so a variable read
 * anywhere else is a second place the build has to be configured for. Keeping
 * the reads here means the pure modules beside them, `api-base.utils.ts` in
 * particular, take their value as an argument and stay covered.
 *
 * This is the front end twin of `api/src/runner/runner.environment.ts`.
 */

function readEnvironmentValue(name: string): unknown {
  const environment: Record<string, unknown> = import.meta.env;
  return environment[name];
}

function readEnvironmentText(name: string): string | undefined {
  const value = readEnvironmentValue(name);
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value;
}

/**
 * The configured API base, left as `unknown` so `selectApiBase` keeps its own
 * check on a value that is absent or not a string.
 */
// @FollowsBlueprint environment-reader
export function readApiBaseSetting(): unknown {
  return readEnvironmentValue('VITE_API_BASE');
}

/** The Sentry project to report to, or `undefined` when reporting is off. */
export function readSentryDsn(): string | undefined {
  return readEnvironmentText('VITE_SENTRY_DSN');
}

/** The deployment stage a Sentry event is tagged with. */
export function readStageName(): string | undefined {
  return readEnvironmentText('VITE_STAGE');
}
