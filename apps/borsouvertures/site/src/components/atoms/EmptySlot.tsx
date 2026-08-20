/**
 * @Blueprint atom-null-render
 * @BlueprintName Null Rendering Atom
 * @BlueprintUsage Use for the absent branch of a component lookup table, so the table has a component to name instead of a hole.
 * @BlueprintDescription Returns `null` and declares that return type, which is what lets one shared component sit in a table beside components with real props. Callers spread the same props onto whichever entry the lookup returned, so the extra props are simply ignored here rather than guarded against, and the alternative of storing `null` in the table is avoided because a stored `null` is not callable as a component.
 */
export function EmptySlot(): null {
  return null;
}
