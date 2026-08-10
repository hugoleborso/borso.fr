/**
 * Song-draft shape + helpers shared between SongDetailPage and the
 * child form components. Extracted so the parent stays under the
 * file-length limit.
 */

import { z } from 'zod';
import type { SongChartKind } from './SongChartFields';
import type { SongExternalLinkValue } from './SongExternalLinks';

export const songStatuses = ['idea', 'wip', 'rehearsed', 'concert_ready'] as const;
export const linkProviders = ['spotify', 'deezer', 'youtube', 'other'] as const;

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
  mbid: z.string().nullable().default(null),
  album: z.string().nullable().default(null),
  durationSeconds: z.number().nullable().default(null),
  isrcs: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});
export const singleSongSchema = z.object({ song: songSchema });

export type Song = z.infer<typeof songSchema>;
export type SongStatus = (typeof songStatuses)[number];

export interface SongDraftState {
  title: string;
  artist: string;
  status: SongStatus;
  tonalityStart: string;
  tonalityEnd: string;
  baseEnergy: string;
  chartKind: SongChartKind;
  chordproText: string;
  pdfS3Key: string;
  imageS3Key: string;
  links: SongExternalLinkValue[];
  mbid: string | null;
  album: string;
  durationSeconds: number | null;
  isrcs: string[];
  tags: string[];
}

export const BLANK_SONG_DRAFT: SongDraftState = {
  title: '',
  artist: '',
  status: 'idea',
  tonalityStart: '',
  tonalityEnd: '',
  baseEnergy: '',
  chartKind: 'none',
  chordproText: '',
  pdfS3Key: '',
  imageS3Key: '',
  links: [],
  mbid: null,
  album: '',
  durationSeconds: null,
  isrcs: [],
  tags: [],
};

export function songFromApi(song: Song): SongDraftState {
  return {
    title: song.title,
    artist: song.artist,
    status: song.status,
    tonalityStart: song.tonalityStart ?? '',
    tonalityEnd: song.tonalityEnd ?? '',
    baseEnergy: song.baseEnergy === null ? '' : String(song.baseEnergy),
    chartKind: song.chart === null ? 'none' : song.chart.kind,
    chordproText: song.chart !== null && song.chart.kind === 'chordpro' ? song.chart.text : '',
    pdfS3Key: song.chart !== null && song.chart.kind === 'pdf' ? song.chart.s3Key : '',
    imageS3Key: song.chart !== null && song.chart.kind === 'image' ? song.chart.s3Key : '',
    links: song.links,
    mbid: song.mbid,
    album: song.album ?? '',
    durationSeconds: song.durationSeconds,
    isrcs: song.isrcs,
    tags: song.tags,
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
  readonly tonalityStart: string | null;
  readonly tonalityEnd: string | null;
  readonly baseEnergy: number | null;
  readonly chart: Song['chart'];
  readonly links: SongExternalLinkValue[];
  readonly mbid: string | null;
  readonly album: string | null;
  readonly durationSeconds: number | null;
  readonly isrcs: string[];
  readonly tags: string[];
}

export function payloadFromDraft(draft: SongDraftState): SongSavePayload | null {
  const titleTrimmed = draft.title.trim();
  if (titleTrimmed.length === 0) return null;
  const baseEnergyValue = draft.baseEnergy.trim().length === 0 ? null : Number(draft.baseEnergy);
  const albumTrimmed = draft.album.trim();
  return {
    title: titleTrimmed,
    artist: draft.artist.trim(),
    status: draft.status,
    tonalityStart: draft.tonalityStart.trim().length === 0 ? null : draft.tonalityStart.trim(),
    tonalityEnd: draft.tonalityEnd.trim().length === 0 ? null : draft.tonalityEnd.trim(),
    baseEnergy: baseEnergyValue,
    chart: chartFromDraft(draft),
    links: draft.links,
    mbid: draft.mbid,
    album: albumTrimmed.length === 0 ? null : albumTrimmed,
    durationSeconds: draft.durationSeconds,
    isrcs: draft.isrcs,
    tags: draft.tags,
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
  readonly mbid: string;
  readonly title: string;
  readonly artist: string;
  readonly album: string | null;
  readonly durationSeconds: number | null;
  readonly isrcs: readonly string[];
  readonly tags: readonly string[];
}

export function applyExternalPickToDraft(
  draft: SongDraftState,
  hit: ExternalSongPick,
): SongDraftState {
  return {
    ...draft,
    title: hit.title,
    artist: hit.artist,
    mbid: hit.mbid,
    album: hit.album ?? '',
    durationSeconds: hit.durationSeconds,
    isrcs: [...hit.isrcs],
    tags: [...hit.tags],
  };
}
