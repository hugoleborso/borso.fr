/** @Feature inspirations */

import {
  buildYoutubeWatchUrl,
  type PassageRefusal,
  parseYoutubeVideoId,
  selectPassageRefusal,
} from '@domain/inspiration.core';
import type { ParseKeys } from 'i18next';
import type { InspirationFieldsShape } from '../../lib/queries/inspiration-cache.core';
import type { InspirationRefusal } from '../../lib/queries/inspiration-refusal.core';
import { shouldSearchMusicServiceFor } from '../../routes/catalog/add-song.core';

export interface InspirationFormValues {
  readonly title: string;
  readonly artist: string;
  readonly deezerTrackId: string | null;
  readonly deezerAlbumId: string | null;
  readonly youtubeLink: string;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly note: string;
}

export interface PickedDeezerHit {
  readonly title: string;
  readonly artist: string;
  readonly deezerTrackId: string;
  readonly deezerAlbumId: string | null;
}

export type InspirationFormRefusal = 'title-missing' | 'not-a-youtube-link' | PassageRefusal;

export const INSPIRATION_FORM_REFUSAL_KEY = {
  'title-missing': 'inspirations.form.titleMissing',
  'not-a-youtube-link': 'inspirations.form.notAYoutubeLink',
  'end-not-after-start': 'inspirations.form.endNotAfterStart',
  'passage-too-long': 'inspirations.form.passageTooLong',
} as const satisfies Readonly<Record<InspirationFormRefusal, ParseKeys>>;

export const INSPIRATION_SAVE_FAILURE_KEY = {
  'inspiration-in-use': 'inspirations.refusal.unknown',
  'inspiration-not-found': 'inspirations.refusal.notFound',
  unknown: 'inspirations.refusal.unknown',
} as const satisfies Readonly<Record<InspirationRefusal['kind'], ParseKeys>>;

const DEFAULT_PASSAGE_SECONDS = 10;

export const EMPTY_INSPIRATION_FORM: InspirationFormValues = {
  title: '',
  artist: '',
  deezerTrackId: null,
  deezerAlbumId: null,
  youtubeLink: '',
  startSeconds: 0,
  endSeconds: DEFAULT_PASSAGE_SECONDS,
  note: '',
};

// @FollowsBlueprint core-view-projection
export function startInspirationForm(
  inspiration: (InspirationFieldsShape & { readonly id: string }) | null,
): InspirationFormValues {
  if (inspiration === null) return EMPTY_INSPIRATION_FORM;
  return {
    title: inspiration.title,
    artist: inspiration.artist,
    deezerTrackId: inspiration.deezerTrackId,
    deezerAlbumId: inspiration.deezerAlbumId,
    youtubeLink: buildYoutubeWatchUrl(inspiration.youtubeVideoId, inspiration.startSeconds),
    startSeconds: inspiration.startSeconds,
    endSeconds: inspiration.endSeconds,
    note: inspiration.note,
  };
}

export function applyPickedHit(
  values: InspirationFormValues,
  hit: PickedDeezerHit,
): InspirationFormValues {
  return {
    ...values,
    title: hit.title,
    artist: hit.artist,
    deezerTrackId: hit.deezerTrackId,
    deezerAlbumId: hit.deezerAlbumId,
  };
}

export function changeTitle(values: InspirationFormValues, title: string): InspirationFormValues {
  return { ...values, title, deezerTrackId: null, deezerAlbumId: null };
}

export function shouldSearchDeezerFor(
  searchedTitle: string,
  deezerTrackId: string | null,
): boolean {
  return deezerTrackId === null && shouldSearchMusicServiceFor(searchedTitle, null);
}

export function readWholeSeconds(typed: string): number {
  const seconds = Math.floor(Number(typed));
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

export function selectInspirationFormRefusal(
  values: InspirationFormValues,
): InspirationFormRefusal | null {
  if (values.title.trim().length === 0) return 'title-missing';
  if (parseYoutubeVideoId(values.youtubeLink) === null) return 'not-a-youtube-link';
  return selectPassageRefusal(values);
}

export function buildInspirationFields(
  values: InspirationFormValues,
  youtubeVideoId: string,
): InspirationFieldsShape {
  return {
    youtubeVideoId,
    title: values.title.trim(),
    artist: values.artist.trim(),
    deezerTrackId: values.deezerTrackId,
    deezerAlbumId: values.deezerAlbumId,
    startSeconds: values.startSeconds,
    endSeconds: values.endSeconds,
    note: values.note.trim(),
  };
}
