/**
 * Runner — pure domain helpers. Same `.core.ts` contract as the other
 * features: no I/O, no `new Date()` (callers pass `now` if needed).
 */

import type { LoopPunch } from '../punch/punch.types';
import type { Runner } from './runner.types';

const MAX_SLUG_LENGTH = 64;
const DIACRITIC_PATTERN = /[̀-ͯ]/g;
const NON_SLUG_PATTERN = /[^a-z0-9]+/g;
const TRIM_DASH_PATTERN = /^-+|-+$/g;

/**
 * Build a stable URL-safe slug from a runner's display name. Used as a
 * default when the orga doesn't override it in the admin form (the
 * fiche-coureur URL is `/r/<slug>`, so the slug has to be predictable
 * and human-typable).
 */
// @FollowsBlueprint core-decision
export function slugifyDisplayName(displayName: string): string {
  const lowered = displayName.toLowerCase();
  const decomposed = lowered.normalize('NFD').replace(DIACRITIC_PATTERN, '');
  const dashed = decomposed.replace(NON_SLUG_PATTERN, '-').replace(TRIM_DASH_PATTERN, '');
  return dashed.slice(0, MAX_SLUG_LENGTH);
}

export type RunnerValidationFailure = 'slug-edge-dash' | 'bib-already-taken';

export type RunnerValidation =
  { readonly ok: true } | { readonly ok: false; readonly reason: RunnerValidationFailure };

/**
 * Validate a runner draft against the two rules `createRunnerInputSchema`
 * cannot express: a bib no other runner of the edition already holds, and
 * a slug free of the leading or trailing dash `runnerSlugSchema`'s regex
 * accepts.
 *
 * `createRunner` does not call this yet: whether two runners may share a
 * bib depends on the relay format, which is undecided.
 */
// @FollowsBlueprint core-decision
export function validateRunnerDraft(
  draft: { readonly slug: string; readonly bib: number },
  existingRoster: readonly Runner[],
): RunnerValidation {
  if (draft.slug.startsWith('-') || draft.slug.endsWith('-')) {
    return { ok: false, reason: 'slug-edge-dash' };
  }
  if (existingRoster.some((runner) => runner.bib === draft.bib)) {
    return { ok: false, reason: 'bib-already-taken' };
  }
  return { ok: true };
}

/**
 * Total elapsed time on track for a runner — sum of consecutive-loop
 * gaps from the edition start. Used to power runner-fiche stats without
 * pulling the ranking core.
 */
export function totalElapsedMs(
  runnerSlug: string,
  raceStart: Date,
  punches: readonly LoopPunch[],
): number {
  const startMs = raceStart.getTime();
  return punches
    .filter((punch) => punch.runnerSlug === runnerSlug && punch.voidedAt === null)
    .reduce((accumulator, punch) => Math.max(accumulator, punch.finishedAt.getTime() - startMs), 0);
}
