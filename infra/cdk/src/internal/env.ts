/**
 * Environment-variable helpers shared by app CDK entrypoints (`bin/app.ts`).
 *
 * Each helper enforces "the variable is present and shaped as expected"
 * with an actionable error when it isn't — apps should never reach into
 * `process.env` directly when a helper exists for the value.
 *
 * @beta
 */

import { type Stage, assertDeployStage } from './naming.js';

const STAGE_ENV = 'STAGE';
const PR_NUMBER_ENV = 'PR_NUMBER';
const ACCOUNT_ENV = 'CDK_DEFAULT_ACCOUNT';
const ACCOUNT_FALLBACK_ENV = 'AWS_ACCOUNT_ID';
const DEFAULT_STAGE: Stage = 'prod';

/**
 * Reads `name` from the process environment. Throws if it's missing or
 * empty. The error message names the missing variable so callers (and CI
 * logs) can act on it.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required but not set.`);
  }
  return value;
}

/**
 * Reads the `CDK_DEFAULT_ACCOUNT` env (or `AWS_ACCOUNT_ID` as a fallback,
 * since both are common in different deployment harnesses). Throws if
 * neither is set.
 */
export function requireAwsAccount(): string {
  const account = process.env[ACCOUNT_ENV] ?? process.env[ACCOUNT_FALLBACK_ENV];
  if (!account) {
    throw new Error(
      `${ACCOUNT_ENV} (or ${ACCOUNT_FALLBACK_ENV}) is required but not set.`,
    );
  }
  return account;
}

/**
 * Reads the `STAGE` env (default: `prod`). Throws if the value isn't one
 * of the four known stages, or if it's `dev` (which is reserved for app
 * code paths and never deployable — see `Stage` in naming.ts).
 */
export function requireDeployStage(): Exclude<Stage, 'dev'> {
  const raw = process.env[STAGE_ENV] ?? DEFAULT_STAGE;
  if (!isStage(raw)) {
    throw new Error(
      `${STAGE_ENV} must be one of 'prod', 'preview', 'integ', got '${raw}'.`,
    );
  }
  assertDeployStage(raw);
  return raw;
}

function isStage(value: string): value is Stage {
  return value === 'prod' || value === 'preview' || value === 'integ' || value === 'dev';
}

/**
 * Reads the `PR_NUMBER` env. Throws if it's missing, not an integer, or
 * not strictly positive.
 */
export function requirePrNumber(): number {
  const raw = requireEnv(PR_NUMBER_ENV);
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${PR_NUMBER_ENV} must be a positive integer, got '${raw}'.`);
  }
  return parsed;
}
