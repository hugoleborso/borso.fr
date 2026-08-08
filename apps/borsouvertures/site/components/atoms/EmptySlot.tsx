/**
 * The "render nothing" entry of a component lookup table. Every table that
 * chooses between showing something and showing nothing points its absent case
 * here, so the choice stays a table lookup rather than a branch.
 */
export function EmptySlot(): null {
  return null;
}
