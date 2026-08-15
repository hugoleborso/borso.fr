/**
 * What a song row looks like after a write the server has not answered yet.
 *
 * An optimistic mutation has to put a row in the cache that a read could have
 * returned, so these build one from the write's own body: the fields a create
 * leaves to the server take their defaults, and the shapes a write is allowed
 * to send are normalised into the single shape a read always answers with.
 *
 * They live here rather than beside the hooks because they are pure, which is
 * what puts them under the coverage and mutation gates — cache projection is
 * exactly the logic worth pinning, since a field this gets wrong shows the
 * operator something the server never said. `createdAt` arrives as an argument
 * for the same reason: a `.core.ts` file never reads the clock.
 */

import { normalizeLineup } from '@domain/lineup.core';
import type { InferResponseType } from 'hono/client';
import type { api } from '../api';

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

/**
 * A lineup travels to the API in any of the shapes the body accepts — a list
 * per member, or the single id and null the older rows carry — while a read
 * always answers with lists. The optimistic row has to look like a read, so
 * the write shape is normalised here rather than surfacing as two shapes in
 * the cache.
 */
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
