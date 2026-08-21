/**
 * @Blueprint utils-branchless-list
 * @BlueprintName Branchless Optional As A List
 * @BlueprintUsage Use for a value that may be absent, or an action that only applies under a condition, so the caller iterates instead of branching.
 * @BlueprintDescription Turns an optional into a list of nought or one entries, and `listWhen` beside it does the same for a condition. A caller then writes `listPresent(edition).map(...)` in JSX, or `for (const slug of listWhen(isConfirmed, edition.slug))` in a handler, which puts the only null check and the only confirmation check in two functions with their own tests rather than in a dozen call sites.
 */
export function listPresent<T>(value: T | null | undefined): readonly T[] {
  if (value === null || value === undefined) return [];
  return [value];
}

export function listWhen<T>(isIncluded: boolean, value: T): readonly T[] {
  if (isIncluded) return [value];
  return [];
}
