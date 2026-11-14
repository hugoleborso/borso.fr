/** @Feature compositions */

export interface CompositionLink {
  readonly id: string;
  readonly songId: string | null;
}

// @FollowsBlueprint core-view-intent
export function selectNextCompositionNumber(compositions: readonly unknown[]): number {
  return compositions.length + 1;
}

export function selectCompositionOfSong<Composition extends CompositionLink>(
  compositions: readonly Composition[],
  songId: string,
): Composition | null {
  return compositions.find((composition) => composition.songId === songId) ?? null;
}
