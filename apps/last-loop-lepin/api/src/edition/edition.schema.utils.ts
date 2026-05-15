/**
 * Pure helpers for `edition.schema.ts` Zod refines. Defence-in-depth checks
 * against corrupted serialised GPX metadata read back from the database.
 */

/**
 * Returns `true` iff `values` is a strictly-increasing sequence starting at
 * exactly `0` and ending at exactly `1`, with every entry a finite number.
 * Empty and single-element arrays are rejected (no usable spread). Strict
 * monotonicity (`>`, not `>=`) is the convention: a duplicate fraction
 * would project the avatar onto a zero-time span and divide by zero. NaN
 * is rejected because every comparison with NaN is `false`, so an
 * unguarded `>` would silently accept it.
 */
export function isMonotonicZeroToOne(values: readonly number[]): boolean {
  if (values.length < 2) return false;
  if (values[0] !== 0) return false;
  if (values[values.length - 1] !== 1) return false;
  // `reduce` exposes each element as `number` (not `number | undefined`),
  // which sidesteps `noUncheckedIndexedAccess` without a banned non-null
  // assertion. The accumulator threads the previous value through.
  let strictlyIncreasing = true;
  values.reduce((previous, current) => {
    if (!Number.isFinite(current) || current <= previous) {
      strictlyIncreasing = false;
    }
    return current;
  });
  return strictlyIncreasing;
}
