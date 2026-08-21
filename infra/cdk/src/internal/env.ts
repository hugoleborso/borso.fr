import { assertDeployStage, type Stage } from './naming.utils.js';

const STAGE_ENV = 'STAGE';
const PR_NUMBER_ENV = 'PR_NUMBER';
const ACCOUNT_ENV = 'CDK_DEFAULT_ACCOUNT';
const ACCOUNT_FALLBACK_ENV = 'AWS_ACCOUNT_ID';
const DEFAULT_STAGE: Stage = 'prod';

// @FollowsBlueprint environment-reader
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required but not set.`);
  }
  return value;
}

export function requireAwsAccount(): string {
  const account = process.env[ACCOUNT_ENV] ?? process.env[ACCOUNT_FALLBACK_ENV];
  if (!account) {
    throw new Error(`${ACCOUNT_ENV} (or ${ACCOUNT_FALLBACK_ENV}) is required but not set.`);
  }
  return account;
}

export function requireDeployStage(): Exclude<Stage, 'dev'> {
  const raw = process.env[STAGE_ENV] ?? DEFAULT_STAGE;
  if (!isStage(raw)) {
    throw new Error(`${STAGE_ENV} must be one of 'prod', 'preview', 'integ', got '${raw}'.`);
  }
  assertDeployStage(raw);
  return raw;
}

function isStage(value: string): value is Stage {
  return value === 'prod' || value === 'preview' || value === 'integ' || value === 'dev';
}

export function requirePrNumber(): number {
  const raw = requireEnv(PR_NUMBER_ENV);
  const asNumber = Number(raw);
  if (!Number.isInteger(asNumber) || asNumber <= 0) {
    throw new Error(`${PR_NUMBER_ENV} must be a positive integer, got '${raw}'.`);
  }
  return asNumber;
}
