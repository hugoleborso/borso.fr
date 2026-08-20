import type { LoopPunch } from '../punch/punch.types';
import type { Runner } from './runner.types';

const MAX_SLUG_LENGTH = 64;
const DIACRITIC_PATTERN = /[̀-ͯ]/g;
const NON_SLUG_PATTERN = /[^a-z0-9]+/g;
const TRIM_DASH_PATTERN = /^-+|-+$/g;

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

export function elapsedSinceRaceStartMs(
  runnerSlug: string,
  raceStart: Date,
  punches: readonly LoopPunch[],
): number {
  const startMs = raceStart.getTime();
  return punches
    .filter((punch) => punch.runnerSlug === runnerSlug && punch.voidedAt === null)
    .reduce((accumulator, punch) => Math.max(accumulator, punch.finishedAt.getTime() - startMs), 0);
}
