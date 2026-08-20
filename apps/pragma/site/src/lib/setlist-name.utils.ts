/**
 * What a setlist is called on screen. A setlist can be saved with no
 * name — the band writes one set in a hurry and names it later — and
 * every surface listing it has to show something, so the fallback is
 * decided once here rather than re-decided at each call site.
 * @Feature setlists
 */

// @FollowsBlueprint utils-pure-module
export function selectSetlistDisplayName(name: string, fallback: string): string {
  return name.trim().length > 0 ? name : fallback;
}
