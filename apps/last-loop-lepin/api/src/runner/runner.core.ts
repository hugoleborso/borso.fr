/**
 * Runner — pure domain helpers. Same `.core.ts` contract as the other
 * features: no I/O, no `new Date()` (callers pass `now` if needed).
 */

import type { LoopPunch } from '../punch/punch.types';
import type { Runner } from './runner.types';

const MIN_DISPLAY_NAME_LENGTH = 1;
const MAX_DISPLAY_NAME_LENGTH = 120;
const MIN_SLUG_LENGTH = 2;
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
export function slugifyDisplayName(displayName: string): string {
  const lowered = displayName.toLowerCase();
  const decomposed = lowered.normalize('NFD').replace(DIACRITIC_PATTERN, '');
  const dashed = decomposed.replace(NON_SLUG_PATTERN, '-').replace(TRIM_DASH_PATTERN, '');
  return dashed.slice(0, MAX_SLUG_LENGTH);
}

export type RunnerValidationFailure =
  | 'display-name-empty'
  | 'display-name-too-long'
  | 'slug-too-short'
  | 'slug-too-long'
  | 'slug-invalid-chars'
  | 'bib-not-positive'
  | 'bib-already-taken';

export type RunnerValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: RunnerValidationFailure };

/**
 * Validate a runner draft against the rules the controller can't express
 * via Zod alone — namely the per-edition bib uniqueness check, which
 * needs the existing roster.
 */
export function validateRunnerDraft(
  draft: { readonly displayName: string; readonly slug: string; readonly bib: number | null },
  existingRoster: readonly Runner[],
): RunnerValidation {
  const name = draft.displayName.trim();
  if (name.length < MIN_DISPLAY_NAME_LENGTH) return { ok: false, reason: 'display-name-empty' };
  if (name.length > MAX_DISPLAY_NAME_LENGTH) return { ok: false, reason: 'display-name-too-long' };

  if (draft.slug.length < MIN_SLUG_LENGTH) return { ok: false, reason: 'slug-too-short' };
  if (draft.slug.length > MAX_SLUG_LENGTH) return { ok: false, reason: 'slug-too-long' };
  if (NON_SLUG_PATTERN.test(draft.slug) || draft.slug.startsWith('-') || draft.slug.endsWith('-')) {
    return { ok: false, reason: 'slug-invalid-chars' };
  }

  if (draft.bib !== null) {
    if (!Number.isInteger(draft.bib) || draft.bib <= 0) return { ok: false, reason: 'bib-not-positive' };
    if (existingRoster.some((runner) => runner.bib === draft.bib)) {
      return { ok: false, reason: 'bib-already-taken' };
    }
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
