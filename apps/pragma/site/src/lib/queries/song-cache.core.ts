import { normalizeLineup } from '@domain/lineup.core';
import type { InferResponseType } from 'hono/client';
import type { api } from '../api.client';

type SongsListResponse = InferResponseType<typeof api.api.songs.$get>;
type SongRow = SongsListResponse['songs'][number];
type SongCreateVariables = Parameters<typeof api.api.songs.$post>[0]['json'];
type SongUpdateVariables = { id: string } & Parameters<
  (typeof api.api.songs)[':id']['$put']
>[0]['json'];

const NEW_SONG_DEFAULTS: Pick<
  SongRow,
  | 'artist'
  | 'links'
  | 'chart'
  | 'tonalityStart'
  | 'tonalityEnd'
  | 'defaultLineup'
  | 'baseEnergy'
  | 'mbid'
  | 'album'
  | 'durationSeconds'
  | 'isrcs'
  | 'tags'
  | 'structureNotes'
  | 'gimmickNotes'
  | 'notes'
> = {
  artist: '',
  links: [],
  chart: null,
  tonalityStart: null,
  tonalityEnd: null,
  defaultLineup: {},
  baseEnergy: null,
  mbid: null,
  album: null,
  durationSeconds: null,
  isrcs: [],
  tags: [],
  structureNotes: '',
  gimmickNotes: '',
  notes: '',
};

function normaliseLinks(links: SongCreateVariables['links']): SongRow['links'] {
  if (links === undefined) return [];
  return links.map((link) => ({
    url: link.url,
    provider: link.provider,
    comment: link.comment ?? '',
  }));
}

function normaliseLineup(lineup: SongCreateVariables['defaultLineup']): SongRow['defaultLineup'] {
  if (lineup === undefined) return {};
  return normalizeLineup(lineup);
}

// @FollowsBlueprint core-projection
export function buildOptimisticSong(
  id: string,
  createdAt: string,
  input: SongCreateVariables,
): SongRow {
  const { links: inputLinks, defaultLineup: inputLineup, ...rest } = input;
  return {
    ...NEW_SONG_DEFAULTS,
    ...rest,
    links: normaliseLinks(inputLinks),
    defaultLineup: normaliseLineup(inputLineup),
    id,
    createdAt,
  };
}

// @FollowsBlueprint core-projection
export function mergeSongUpdate(
  existing: SongRow,
  patch: Omit<SongUpdateVariables, 'id'>,
): SongRow {
  const { links: patchLinks, defaultLineup: patchLineup, ...rest } = patch;
  const merged: SongRow = { ...existing, ...rest };
  if (patchLinks !== undefined) merged.links = normaliseLinks(patchLinks);
  if (patchLineup !== undefined) merged.defaultLineup = normaliseLineup(patchLineup);
  return merged;
}
