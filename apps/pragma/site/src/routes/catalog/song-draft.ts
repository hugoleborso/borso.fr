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
  };
}

export function chartFromDraft(draft: SongDraftState): Song['chart'] {
  if (draft.chartKind === 'none') return null;
  if (draft.chartKind === 'chordpro') return { kind: 'chordpro', text: draft.chordproText };
  if (draft.chartKind === 'pdf') return { kind: 'pdf', s3Key: draft.pdfS3Key };
  return { kind: 'image', s3Key: draft.imageS3Key };
}

export function detectProvider(url: string): SongExternalLinkValue['provider'] {
  const lower = url.toLowerCase();
  if (lower.includes('spotify.com')) return 'spotify';
  if (lower.includes('deezer.com')) return 'deezer';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  return 'other';
}
