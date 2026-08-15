import { defineStrykerConfig } from './stryker.shared.js';

/**
 * Mutation testing for the repository's own tooling.
 *
 * Every application has held its pure modules to zero surviving mutants for
 * months. The generators under `scripts/` that decide whether a standard is
 * enforced, which questions the tree has answered twice, and where the next
 * defect is likely to come from, held none: the pre-push wave iterates the
 * `apps/*` workspaces and the root was not one of them, so this code reached
 * full coverage and was never mutated.
 *
 * A generator that is wrong reports a green gate on a rule that is not running,
 * which is worse than an application bug, because it is the thing that would
 * have told you.
 */
export default defineStrykerConfig({
  mutate: ['scripts/**/*.core.ts', 'scripts/**/*.utils.ts'],
});
