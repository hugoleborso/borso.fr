import { isProductionStage, type Stage } from './naming.utils.js';

export const ALLOW_TEST_SEED_ENV_VAR = 'ALLOW_TEST_SEED';

const NO_TEST_SEED_ENVIRONMENT: Readonly<Record<string, string>> = {};

/**
 * @Blueprint construct-stage-selector
 * @BlueprintName Stage Wiring Selector
 * @BlueprintUsage Use whenever a construct would otherwise branch on the stage inline to decide what to wire.
 * @BlueprintDescription Lifts the stage branch out of the construct into a pure function that takes the stage and returns the value to spread, so the prod exclusion is an assertion a test can make on a returned object instead of a search through a synthesised template. The branch asks `isProductionStage` rather than naming a stage, and the prod answer is a shared frozen empty object, so spreading the result is always safe and the caller writes no conditional of its own.
 */
export function selectTestSeedEnvironment(stage: Stage): Readonly<Record<string, string>> {
  if (isProductionStage(stage)) return NO_TEST_SEED_ENVIRONMENT;
  return { [ALLOW_TEST_SEED_ENV_VAR]: '1' };
}

// @FollowsBlueprint construct-stage-selector
export function selectSameOriginApiDomainName(
  stage: Stage,
  apiDomainName: string,
): string | undefined {
  if (!isProductionStage(stage)) return undefined;
  return apiDomainName;
}
