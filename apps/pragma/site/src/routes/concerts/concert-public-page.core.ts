/** @Feature concert-registrations */

import {
  CONCERT_POSTER_CONTENT_TYPES,
  CONCERT_POSTER_MAX_MEBIBYTES,
  CONCERT_PRIZE_LABEL_MAX_LENGTH,
  CONCERT_PUBLIC_MESSAGE_MAX_LENGTH,
} from '@domain/input-limits.core';

export const POSTER_CONTENT_TYPES = CONCERT_POSTER_CONTENT_TYPES;

export const PDF_CONTENT_TYPE = 'application/pdf';

export const POSTER_FILE_TYPES = [...POSTER_CONTENT_TYPES, PDF_CONTENT_TYPE] as const;

export const PRIZE_LABEL_MAX_LENGTH = CONCERT_PRIZE_LABEL_MAX_LENGTH;

export type PosterContentType = (typeof POSTER_CONTENT_TYPES)[number];

const BYTES_PER_MEBIBYTE = 1_048_576;
export const POSTER_MAX_BYTES = CONCERT_POSTER_MAX_MEBIBYTES * BYTES_PER_MEBIBYTE;

export const DRAW_WINNER_COUNT = 3;

export const PUBLIC_MESSAGE_MAX_LENGTH = CONCERT_PUBLIC_MESSAGE_MAX_LENGTH;

export type PosterRefusalKey = 'sessions.posterWrongType' | 'sessions.posterTooLarge';

export interface PosterCheck {
  readonly contentType: PosterContentType | null;
  readonly refusalKey: PosterRefusalKey | null;
}

// @FollowsBlueprint core-decision
export function checkPoster(type: string, byteSize: number): PosterCheck {
  const contentType = POSTER_CONTENT_TYPES.find((allowed) => allowed === type);
  if (contentType === undefined) {
    return { contentType: null, refusalKey: 'sessions.posterWrongType' };
  }
  if (byteSize > POSTER_MAX_BYTES)
    return { contentType: null, refusalKey: 'sessions.posterTooLarge' };
  return { contentType, refusalKey: null };
}

export function isPdfPoster(type: string): boolean {
  return type === PDF_CONTENT_TYPE;
}

export function findPosterFileRefusal(type: string, byteSize: number): PosterRefusalKey | null {
  if (!isPdfPoster(type)) return checkPoster(type, byteSize).refusalKey;
  return byteSize > POSTER_MAX_BYTES ? 'sessions.posterTooLarge' : null;
}

export class PosterRefusal extends Error {
  readonly refusalKey: PosterRefusalKey;

  constructor(refusalKey: PosterRefusalKey) {
    super(refusalKey);
    this.name = 'PosterRefusal';
    this.refusalKey = refusalKey;
  }
}

export type PublicPageSaveErrorKey = PosterRefusalKey | 'sessions.publicPageSaveFailed';

export function selectPublicPageSaveErrorKey(error: unknown): PublicPageSaveErrorKey | null {
  if (error === null) return null;
  return error instanceof PosterRefusal ? error.refusalKey : 'sessions.publicPageSaveFailed';
}

export function pickDrawWinners<Entry>(
  entries: readonly Entry[],
  random: () => number,
  count: number = DRAW_WINNER_COUNT,
): readonly Entry[] {
  const pool = [...entries];
  const winners: Entry[] = [];
  while (winners.length < count && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    winners.push(...pool.splice(index, 1));
  }
  return winners;
}

export function normaliseMessage(message: string): string | null {
  const trimmed = message.trim();
  return trimmed.length === 0 ? null : trimmed;
}
