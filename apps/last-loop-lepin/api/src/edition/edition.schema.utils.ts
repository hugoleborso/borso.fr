/**
 * @Blueprint schema-refine-pure-helper
 * @BlueprintName Schema Refine Pure Helper
 * @BlueprintUsage Use for the predicate behind a Zod `.refine`, so the rule sits in a covered sibling instead of an inline arrow function.
 * @BlueprintDescription Exports the refine predicate from a `.schema.utils.ts` sibling that carries the full coverage gate, so `edition.schema.ts` passes it by name and every rejection case, including the NaN one an unguarded comparison would let through, has its own test.
 */
export function isMonotonicZeroToOne(values: readonly number[]): boolean {
  if (values[0] !== 0) return false;
  if (values[values.length - 1] !== 1) return false;
  let isStrictlyIncreasing = true;
  values.reduce((previous, current) => {
    if (!Number.isFinite(current) || current <= previous) {
      isStrictlyIncreasing = false;
    }
    return current;
  });
  return isStrictlyIncreasing;
}
