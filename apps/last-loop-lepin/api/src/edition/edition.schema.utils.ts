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
/**
 * @Blueprint schema-refine-pure-helper
 * @BlueprintName Schema Refine Pure Helper
 * @BlueprintUsage Use for the predicate behind a Zod `.refine`, so the rule sits in a covered sibling instead of an inline arrow function.
 * @BlueprintDescription Exports the refine predicate from a `.schema.utils.ts` sibling that carries the full coverage gate, so `edition.schema.ts` passes it by name and every rejection case, including the NaN one an unguarded comparison would let through, has its own test.
 */
export function isMonotonicZeroToOne(values: readonly number[]): boolean {
  if (values[0] !== 0) return false;
  if (values[values.length - 1] !== 1) return false;
  // `reduce` exposes each element as `number` (not `number | undefined`),
  // which sidesteps `noUncheckedIndexedAccess` without a banned non-null
  // assertion. The accumulator threads the previous value through.
  let isStrictlyIncreasing = true;
  values.reduce((previous, current) => {
    if (!Number.isFinite(current) || current <= previous) {
      isStrictlyIncreasing = false;
    }
    return current;
  });
  return isStrictlyIncreasing;
}
