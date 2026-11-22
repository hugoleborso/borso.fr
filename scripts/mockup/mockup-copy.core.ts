export const WORDY_ARTBOARD_LIMIT = 25;

const BLOCKS_WITHOUT_VISIBLE_TEXT = /<(script|style|helmet|svg|head)\b[\s\S]*?<\/\1>/giu;
const TEMPLATE_HOLE = /\{\{[^}]*\}\}/gu;
const TAG = /<[^>]*>/gu;
const ENTITY = /&[a-z#0-9]+;/giu;
const WORD = /\p{L}[\p{L}'’-]*/gu;

export interface ArtboardSource {
  readonly path: string;
  readonly html: string;
}

export interface WordyArtboard {
  readonly path: string;
  readonly words: number;
}

// @FollowsBlueprint utils-pure-module
export function countVisibleWords(html: string): number {
  const visible = html
    .replaceAll(BLOCKS_WITHOUT_VISIBLE_TEXT, ' ')
    .replaceAll(TEMPLATE_HOLE, ' ')
    .replaceAll(TAG, ' ')
    .replaceAll(ENTITY, ' ');
  return visible.match(WORD)?.length ?? 0;
}

export function selectWordyArtboards(
  artboards: readonly ArtboardSource[],
  limit: number,
): WordyArtboard[] {
  return artboards
    .filter((artboard) => artboard.path.endsWith('.dc.html'))
    .map((artboard) => ({ path: artboard.path, words: countVisibleWords(artboard.html) }))
    .filter((artboard) => artboard.words > limit);
}
