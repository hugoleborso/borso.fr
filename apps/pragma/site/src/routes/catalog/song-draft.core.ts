/** @Feature songs */

import { z } from 'zod';
import { DEFAULT_SONG_ORIGIN, SONG_ORIGINS, type SongOrigin } from '@domain/song-origin.core';
import type { SongChartKind } from '../../components/organisms/SongChartFields';
import type { SongExternalLinkValue } from '../../components/organisms/SongExternalLinks';

export const songStatuses = ['idea', 'wip', 'rehearsed', 'concert_ready'] as const;
export const linkProviders = ['spotify', 'deezer', 'youtube', 'other'] as const;

export const SONG_ORIGIN_LABEL_KEY = {
  cover: 'catalog.originCover',
  original: 'catalog.originOriginal',
} as const satisfies Record<SongOrigin, string>;

export const SONG_STATUS_LABEL_KEY = {
  idea: 'catalog.statusIdea',
  wip: 'catalog.statusWip',
  rehearsed: 'catalog.statusRehearsed',
  concert_ready: 'catalog.statusConcertReady',
} as const satisfies Record<(typeof songStatuses)[number], string>;

export const linkSchema = z.object({
  url: z.string(),
  provider: z.enum(linkProviders),
  comment: z.string().default(''),
});

export const songSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artist: z.string(),
  status: z.enum(songStatuses),
  origin: z.enum(SONG_ORIGINS).default(DEFAULT_SONG_ORIGIN),
  tonalityStart: z.string().nullable(),
  tonalityEnd: z.string().nullable(),
  baseEnergy: z.number().nullable(),
  links: z.array(linkSchema).default([]),
  chart: z
    .union([
      z.object({ kind: z.literal('chordpro'), text: z.string() }),
      z.object({ kind: z.literal('pdf'), s3Key: z.string() }),
      z.object({ kind: z.literal('image'), s3Key: z.string() }),
    ])
    .nullable(),
  deezerTrackId: z.string().nullable().default(null),
  deezerAlbumId: z.string().nullable().default(null),
  spotifyTrackId: z.string().nullable().default(null),
  album: z.string().nullable().default(null),
  durationSeconds: z.number().nullable().default(null),
  isrcs: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  structureNotes: z.string().default(''),
  gimmickNotes: z.string().default(''),
  notes: z.string().default(''),
});
export const singleSongSchema = z.object({ song: songSchema });

export type Song = z.infer<typeof songSchema>;
export type SongStatus = (typeof songStatuses)[number];

export interface SongDraftState {
  title: string;
  artist: string;
  status: SongStatus;
  origin: SongOrigin;
  tonalityStart: string;
  tonalityEnd: string;
  baseEnergy: string;
  chartKind: SongChartKind;
  chordproText: string;
  pdfS3Key: string;
  imageS3Key: string;
  links: SongExternalLinkValue[];
  deezerTrackId: string | null;
  deezerAlbumId: string | null;
  spotifyTrackId: string | null;
  album: string;
  durationSeconds: number | null;
  isrcs: string[];
  tags: string[];
  structureNotes: string;
  gimmickNotes: string;
  notes: string;
}

export const BLANK_SONG_DRAFT: SongDraftState = {
  title: '',
  artist: '',
  status: 'idea',
  origin: DEFAULT_SONG_ORIGIN,
  tonalityStart: '',
  tonalityEnd: '',
  baseEnergy: '',
  chartKind: 'none',
  chordproText: '',
  pdfS3Key: '',
  imageS3Key: '',
  links: [],
  deezerTrackId: null,
  deezerAlbumId: null,
  spotifyTrackId: null,
  album: '',
  durationSeconds: null,
  isrcs: [],
  tags: [],
  structureNotes: '',
  gimmickNotes: '',
  notes: '',
};

export function songFromApi(song: Song): SongDraftState {
  return {
    title: song.title,
    artist: song.artist,
    status: song.status,
    origin: song.origin,
    tonalityStart: song.tonalityStart ?? '',
    tonalityEnd: song.tonalityEnd ?? '',
    baseEnergy: song.baseEnergy === null ? '' : String(song.baseEnergy),
    chartKind: song.chart === null ? 'none' : song.chart.kind,
    chordproText: song.chart !== null && song.chart.kind === 'chordpro' ? song.chart.text : '',
    pdfS3Key: song.chart !== null && song.chart.kind === 'pdf' ? song.chart.s3Key : '',
    imageS3Key: song.chart !== null && song.chart.kind === 'image' ? song.chart.s3Key : '',
    links: song.links,
    deezerTrackId: song.deezerTrackId,
    deezerAlbumId: song.deezerAlbumId,
    spotifyTrackId: song.spotifyTrackId,
    album: song.album ?? '',
    durationSeconds: song.durationSeconds,
    isrcs: song.isrcs,
    tags: song.tags,
    structureNotes: song.structureNotes,
    gimmickNotes: song.gimmickNotes,
    notes: song.notes,
  };
}

export function chartFromDraft(draft: SongDraftState): Song['chart'] {
  if (draft.chartKind === 'none') return null;
  if (draft.chartKind === 'chordpro') return { kind: 'chordpro', text: draft.chordproText };
  if (draft.chartKind === 'pdf') return { kind: 'pdf', s3Key: draft.pdfS3Key };
  return { kind: 'image', s3Key: draft.imageS3Key };
}

export interface SongSavePayload {
  readonly title: string;
  readonly artist: string;
  readonly status: SongStatus;
  readonly origin: SongOrigin;
  readonly tonalityStart: string | null;
  readonly tonalityEnd: string | null;
  readonly baseEnergy: number | null;
  readonly chart: Song['chart'];
  readonly links: SongExternalLinkValue[];
  readonly deezerTrackId: string | null;
  readonly deezerAlbumId: string | null;
  readonly spotifyTrackId: string | null;
  readonly album: string | null;
  readonly durationSeconds: number | null;
  readonly isrcs: string[];
  readonly tags: string[];
  readonly structureNotes: string;
  readonly gimmickNotes: string;
  readonly notes: string;
}

// @FollowsBlueprint core-form-schema
export function payloadFromDraft(draft: SongDraftState): SongSavePayload | null {
  const titleTrimmed = draft.title.trim();
  if (titleTrimmed.length === 0) return null;
  const baseEnergyValue = draft.baseEnergy.trim().length === 0 ? null : Number(draft.baseEnergy);
  const albumTrimmed = draft.album.trim();
  return {
    title: titleTrimmed,
    artist: draft.artist.trim(),
    status: draft.status,
    origin: draft.origin,
    tonalityStart: draft.tonalityStart.trim().length === 0 ? null : draft.tonalityStart.trim(),
    tonalityEnd: draft.tonalityEnd.trim().length === 0 ? null : draft.tonalityEnd.trim(),
    baseEnergy: baseEnergyValue,
    chart: chartFromDraft(draft),
    links: draft.links,
    deezerTrackId: draft.deezerTrackId,
    deezerAlbumId: draft.deezerAlbumId,
    spotifyTrackId: draft.spotifyTrackId,
    album: albumTrimmed.length === 0 ? null : albumTrimmed,
    durationSeconds: draft.durationSeconds,
    isrcs: draft.isrcs,
    tags: draft.tags,
    structureNotes: draft.structureNotes,
    gimmickNotes: draft.gimmickNotes,
    notes: draft.notes,
  };
}

export function detectProvider(url: string): SongExternalLinkValue['provider'] {
  const lower = url.toLowerCase();
  if (lower.includes('spotify.com')) return 'spotify';
  if (lower.includes('deezer.com')) return 'deezer';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  return 'other';
}

export interface ExternalSongPick {
  readonly deezerTrackId: string;
  readonly deezerAlbumId: string | null;
  readonly title: string;
  readonly artist: string;
  readonly album: string | null;
  readonly durationSeconds: number | null;
  readonly isrcs: readonly string[];
}

export function applyExternalPickToDraft(
  draft: SongDraftState,
  hit: ExternalSongPick,
): SongDraftState {
  return {
    ...applyExternalIdentityToDraft(draft, hit),
    title: hit.title,
    artist: hit.artist,
  };
}

export function applyExternalIdentityToDraft(
  draft: SongDraftState,
  hit: ExternalSongPick,
): SongDraftState {
  return {
    ...draft,
    deezerTrackId: hit.deezerTrackId,
    deezerAlbumId: hit.deezerAlbumId,
    spotifyTrackId: null,
    album: hit.album ?? '',
    durationSeconds: hit.durationSeconds,
    isrcs: [...hit.isrcs],
  };
}
