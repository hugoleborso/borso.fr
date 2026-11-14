import type { ServiceIdentity } from './wide-event.core';

function readOptional(variableName: string): string | undefined {
  const value = process.env[variableName];
  return value === undefined || value === '' ? undefined : value;
}

// @FollowsBlueprint environment-reader
export function readServiceIdentity(): ServiceIdentity {
  return { stage: readOptional('STAGE'), version: readOptional('SENTRY_RELEASE') };
}
