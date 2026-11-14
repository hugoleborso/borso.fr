/** @Feature compositions */

export interface CompositionLink {
  readonly id: string;
  readonly songId: string | null;
}

export const COMPOSITION_NUMBER_SLOT = '\u0000';

const DIGITS = /^\d+$/;

function readDefaultTitleNumber(title: string, prefix: string, suffix: string): number {
  const middle = title.slice(prefix.length, title.length - suffix.length);
  const isDefaultTitle = title.startsWith(prefix) && title.endsWith(suffix) && DIGITS.test(middle);
  return isDefaultTitle ? Number(middle) : 0;
}

// @FollowsBlueprint core-view-intent
export function selectNextCompositionNumber(
  titles: readonly string[],
  defaultTitleWithSlot: string,
): number {
  const slotIndex = defaultTitleWithSlot.indexOf(COMPOSITION_NUMBER_SLOT);
  const prefix = defaultTitleWithSlot.slice(0, slotIndex);
  const suffix = defaultTitleWithSlot.slice(slotIndex + COMPOSITION_NUMBER_SLOT.length);
  const titleNumbers = titles.map((title) => readDefaultTitleNumber(title, prefix, suffix));
  return Math.max(titles.length, ...titleNumbers) + 1;
}

export function selectCompositionOfSong<Composition extends CompositionLink>(
  compositions: readonly Composition[],
  songId: string,
): Composition | null {
  return compositions.find((composition) => composition.songId === songId) ?? null;
}
