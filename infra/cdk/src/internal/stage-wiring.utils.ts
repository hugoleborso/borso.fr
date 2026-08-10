/**
 * The two pieces of app wiring that differ between the long-lived environment
 * and the disposable ones.
 *
 * Both live here rather than inside `PreviewableApp` so the prod exclusion is
 * a value a test can assert on, without synthesising a stack.
 */

import { isProductionStage, type Stage } from './naming.utils.js';

/**
 * Env var the construct sets to `'1'` on every non-prod API Lambda. Apps that
 * ship a `/api/__test/seed` route read it to mount the route only when seeding
 * is allowed; prod never receives it, so the route is structurally unreachable
 * in production regardless of app code. Owning the flag here — rather than
 * re-deriving a per-app `<APP>_ALLOW_TEST_SEED` ternary in each stack — is the
 * single point that guarantees the prod-exclusion across every app.
 */
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
/**
 * Prod serves `/api/*` from the frontend distribution so the site can call its
 * own API without CORS. Preview and integ share a host-routed distribution
 * with no surface for a per-PR cache behavior, so they stay cross-origin on a
 * build-time `VITE_API_BASE`.
 */
export function selectSameOriginApiDomainName(
  stage: Stage,
  apiDomainName: string,
): string | undefined {
  if (!isProductionStage(stage)) return undefined;
  return apiDomainName;
}
