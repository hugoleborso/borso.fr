import { SONG_STATUSES } from '../songs/songs.schema';

export type PoolSongStatus = (typeof SONG_STATUSES)[number];

const CONCERT_READY_STATUS: PoolSongStatus = 'concert_ready';

export interface PoolCandidateSong {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly status: PoolSongStatus;
}

export interface SelectPoolParams {
  readonly catalogSongs: readonly PoolCandidateSong[];
  readonly manualSetlistSongIds: readonly string[];
  readonly suggestedSongIds: readonly string[];
  readonly previousWinnerSongIds: readonly string[];
}

export interface PoolEntry {
  readonly songId: string;
  readonly title: string;
  readonly artist: string;
  readonly status: PoolSongStatus;
  readonly voteCount: number;
  readonly isSuggestion: boolean;
}

export interface CountedVote {
  readonly songId: string;
}

export function tallyVotes(votes: readonly CountedVote[]): ReadonlyMap<string, number> {
  const voteCountBySongId = new Map<string, number>();
  for (const vote of votes) {
    voteCountBySongId.set(vote.songId, (voteCountBySongId.get(vote.songId) ?? 0) + 1);
  }
  return voteCountBySongId;
}

// @FollowsBlueprint core-decision
export function selectPool(params: SelectPoolParams): PoolCandidateSong[] {
  const manualSetlistSongIds = new Set(params.manualSetlistSongIds);
  const suggestedSongIds = new Set(params.suggestedSongIds);
  const previousWinnerSongIds = new Set(params.previousWinnerSongIds);
  return params.catalogSongs.filter((song) => {
    const hasWonAnEarlierRound = previousWinnerSongIds.has(song.id);
    if (hasWonAnEarlierRound) return false;
    const wasSuggestedFromTheRoom = suggestedSongIds.has(song.id);
    if (wasSuggestedFromTheRoom) return true;
    const isConcertReady = song.status === CONCERT_READY_STATUS;
    const isAlreadyPlannedTonight = manualSetlistSongIds.has(song.id);
    return isConcertReady && !isAlreadyPlannedTonight;
  });
}

// @FollowsBlueprint core-projection
export function buildPoolEntries(
  pool: readonly PoolCandidateSong[],
  voteCountBySongId: ReadonlyMap<string, number>,
  suggestedSongIds: readonly string[],
): PoolEntry[] {
  const suggested = new Set(suggestedSongIds);
  const poolEntries = pool.map((song) => ({
    songId: song.id,
    title: song.title,
    artist: song.artist,
    status: song.status,
    voteCount: voteCountBySongId.get(song.id) ?? 0,
    isSuggestion: suggested.has(song.id),
  }));
  return poolEntries.sort(compareByStandingThenTitle);
}

function compareByStandingThenTitle(left: PoolEntry, right: PoolEntry): number {
  const byVoteCount = right.voteCount - left.voteCount;
  if (byVoteCount !== 0) return byVoteCount;
  return left.title.localeCompare(right.title);
}
