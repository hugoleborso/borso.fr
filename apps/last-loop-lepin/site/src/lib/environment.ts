function readEnvironmentValue(name: string): unknown {
  const environment: Record<string, unknown> = import.meta.env;
  return environment[name];
}

function readEnvironmentText(name: string): string | undefined {
  const value = readEnvironmentValue(name);
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value;
}

// @FollowsBlueprint environment-reader
export function readApiBaseSetting(): unknown {
  return readEnvironmentValue('VITE_API_BASE');
}

export function readSentryDsn(): string | undefined {
  return readEnvironmentText('VITE_SENTRY_DSN');
}

export function readStageName(): string | undefined {
  return readEnvironmentText('VITE_STAGE');
}
