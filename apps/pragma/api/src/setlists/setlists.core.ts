import { resolveSetlistStatus, type SetlistStatus } from '@domain/setlist-vote.core';
import {
  AUDIENCE_CHOICE_SETLIST_KIND,
  DEFAULT_SETLIST_KIND,
  type SetlistKind,
} from './setlists.schema';

export interface SetlistSongCount {
  readonly setlistId: string;
  readonly songCount: number;
  readonly songIds: readonly string[];
}

const FIRST_POSITION = 0;

// @FollowsBlueprint core-decision
export function selectAudienceChoiceSetlistId(concertId: string): string {
  return concertId;
}

// @FollowsBlueprint core-decision
export function selectNextLinkPosition(highestTakenPosition: number | null): number {
  if (highestTakenPosition === null) return FIRST_POSITION;
  return highestTakenPosition + 1;
}

// @FollowsBlueprint core-projection
export function tallySongsPerSetlist(
  setlistIds: readonly string[],
  entryRows: readonly { readonly setlistId: string; readonly songId: string }[],
): SetlistSongCount[] {
  const songIdsBySetlistId = new Map<string, string[]>();
  for (const row of entryRows) {
    const songIds = songIdsBySetlistId.get(row.setlistId) ?? [];
    songIds.push(row.songId);
    songIdsBySetlistId.set(row.setlistId, songIds);
  }
  return setlistIds.map((setlistId) => {
    const songIds = songIdsBySetlistId.get(setlistId) ?? [];
    return { setlistId, songCount: songIds.length, songIds };
  });
}

export interface SetlistSummary {
  readonly id: string;
  readonly name: string;
  readonly kind: SetlistKind;
  readonly status: SetlistStatus;
  readonly songCount: number;
  readonly songIds: readonly string[];
  readonly sessionIds: string[];
}

// @FollowsBlueprint core-projection
export function buildSetlistSummaries(
  setlists: readonly {
    readonly id: string;
    readonly name: string;
    readonly kind: string | null;
    readonly status: string | null;
  }[],
  songCounts: readonly SetlistSongCount[],
  links: readonly { readonly setlistId: string; readonly sessionId: string }[],
): SetlistSummary[] {
  const songCountBySetlistId = new Map(songCounts.map((count) => [count.setlistId, count]));
  const sessionIdsBySetlistId = new Map<string, string[]>();
  for (const link of links) {
    const known = sessionIdsBySetlistId.get(link.setlistId);
    if (known === undefined) {
      sessionIdsBySetlistId.set(link.setlistId, [link.sessionId]);
      continue;
    }
    known.push(link.sessionId);
  }
  return setlists.map((setlist) => ({
    id: setlist.id,
    name: setlist.name,
    kind: resolveSetlistKind(setlist.kind),
    status: resolveSetlistStatus(setlist.status),
    songCount: songCountBySetlistId.get(setlist.id)?.songCount ?? 0,
    songIds: songCountBySetlistId.get(setlist.id)?.songIds ?? [],
    sessionIds: sessionIdsBySetlistId.get(setlist.id) ?? [],
  }));
}

// @FollowsBlueprint core-decision
export function resolveSetlistKind(storedKind: string | null): SetlistKind {
  if (storedKind === AUDIENCE_CHOICE_SETLIST_KIND) return AUDIENCE_CHOICE_SETLIST_KIND;
  return DEFAULT_SETLIST_KIND;
}

export function isSetlistRenamable(kind: SetlistKind): boolean {
  return kind !== AUDIENCE_CHOICE_SETLIST_KIND;
}
