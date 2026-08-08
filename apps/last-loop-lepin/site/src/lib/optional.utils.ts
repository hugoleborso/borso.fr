/**
 * Turns a condition or an optional value into a list, so a caller can iterate
 * it instead of branching on it. Two lines, and they move the only `null`
 * check and the only "did the operator confirm" check in a dozen call sites
 * into functions that have their own tests.
 */

export function listPresent<T>(value: T | null | undefined): readonly T[] {
  if (value === null || value === undefined) return [];
  return [value];
}

export function listWhen<T>(isIncluded: boolean, value: T): readonly T[] {
  if (isIncluded) return [value];
  return [];
}
