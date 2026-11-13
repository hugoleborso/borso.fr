/** @Feature inspirations */

import type { ParseKeys } from 'i18next';
import { formatDuration } from '../../components/molecules/song-duration.utils';
import type { InspirationShape } from '../../lib/queries/inspiration-cache.core';
import type {
  InspirationRefusal,
  SketchUsingInspiration,
} from '../../lib/queries/inspiration-refusal.core';

export interface InspirationCardView {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly deezerAlbumId: string | null;
  readonly rangeLabel: string;
  readonly detailLabel: string;
  readonly note: string;
  readonly authorName: string | null;
  readonly sketchCount: number;
}

export interface DeletionRefusalMessage {
  readonly key: ParseKeys;
  readonly sketchTitles: string;
}

const RANGE_ARROW = ' → ';
const DETAIL_SEPARATOR = ' · ';
const SKETCH_TITLE_SEPARATOR = ', ';

const DELETION_REFUSAL_KEY = {
  'inspiration-in-use': 'inspirations.refusal.inUse',
  'inspiration-not-found': 'inspirations.refusal.notFound',
  unknown: 'inspirations.refusal.unknown',
} as const satisfies Readonly<Record<InspirationRefusal['kind'], ParseKeys>>;

export function formatPassageRange(passage: {
  readonly startSeconds: number;
  readonly endSeconds: number;
}): string {
  return `${formatDuration(passage.startSeconds)}${RANGE_ARROW}${formatDuration(passage.endSeconds)}`;
}

// @FollowsBlueprint core-view-projection
export function projectInspirationCard(inspiration: InspirationShape): InspirationCardView {
  const rangeLabel = formatPassageRange(inspiration);
  const detailParts = [inspiration.artist, rangeLabel].filter((part) => part.length > 0);
  return {
    id: inspiration.id,
    title: inspiration.title,
    artist: inspiration.artist,
    deezerAlbumId: inspiration.deezerAlbumId,
    rangeLabel,
    detailLabel: detailParts.join(DETAIL_SEPARATOR),
    note: inspiration.note,
    authorName: inspiration.authorName,
    sketchCount: inspiration.sketchCount,
  };
}

function joinSketchTitles(sketches: readonly SketchUsingInspiration[]): string {
  return sketches.map((sketch) => sketch.title).join(SKETCH_TITLE_SEPARATOR);
}

export function selectDeletionRefusalMessage(refusal: InspirationRefusal): DeletionRefusalMessage {
  const sketchTitles =
    refusal.kind === 'inspiration-in-use' ? joinSketchTitles(refusal.sketches) : '';
  return { key: DELETION_REFUSAL_KEY[refusal.kind], sketchTitles };
}
