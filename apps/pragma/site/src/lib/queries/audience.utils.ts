/** @Feature audience-voting */

export const OPEN_ROUND_POLL_INTERVAL_MS = 1_000;

export type VoteDirection = 'cast' | 'retract';

const VOTE_DELTA: Readonly<Record<VoteDirection, number>> = { cast: 1, retract: -1 };
const NO_VOTES_YET = 0;

export interface RoundView {
  readonly id: string;
  readonly openedAt: string;
  readonly closesAt: string;
  readonly remainingSeconds: number;
  readonly isOpen: boolean;
  readonly isSettled: boolean;
  readonly winningSongId: string | null;
}

export interface PoolEntryView {
  readonly songId: string;
  readonly title: string;
  readonly artist: string;
  readonly status: 'idea' | 'wip' | 'rehearsed' | 'concert_ready';
  readonly voteCount: number;
  readonly isSuggestion: boolean;
}

export interface ConcertStateCache {
  readonly state: {
    readonly round: RoundView | null;
    readonly pool: readonly PoolEntryView[];
    readonly ownVotes: readonly string[];
    readonly ballotCount: number;
    readonly capacity: number | null;
  };
}

export interface SuggestedSongView {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly status: PoolEntryView['status'];
}

// @FollowsBlueprint utils-pure-module
export function selectPollInterval(round: RoundView | null | undefined): number | false {
  if (round === null || round === undefined) return false;
  if (!round.isOpen) return false;
  return OPEN_ROUND_POLL_INTERVAL_MS;
}

function isVoteChangePointless(
  ownVotes: readonly string[],
  songId: string,
  direction: VoteDirection,
): boolean {
  const hasVotedAlready = ownVotes.includes(songId);
  return hasVotedAlready === (direction === 'cast');
}

function selectOwnVotesAfter(
  ownVotes: readonly string[],
  songId: string,
  direction: VoteDirection,
): string[] {
  const withoutThisSong = ownVotes.filter((votedSongId) => votedSongId !== songId);
  if (direction === 'retract') return withoutThisSong;
  return [...withoutThisSong, songId];
}

function selectVoteCountAfter(
  entry: PoolEntryView,
  songId: string,
  direction: VoteDirection,
): number {
  if (entry.songId !== songId) return entry.voteCount;
  return entry.voteCount + VOTE_DELTA[direction];
}

export function applyVoteToState(
  cached: ConcertStateCache | undefined,
  songId: string,
  direction: VoteDirection,
): ConcertStateCache | undefined {
  if (cached === undefined) return cached;
  if (isVoteChangePointless(cached.state.ownVotes, songId, direction)) return cached;
  return {
    ...cached,
    state: {
      ...cached.state,
      ownVotes: selectOwnVotesAfter(cached.state.ownVotes, songId, direction),
      pool: cached.state.pool.map((entry) => ({
        ...entry,
        voteCount: selectVoteCountAfter(entry, songId, direction),
      })),
    },
  };
}

export function addSuggestedSongToPool(
  cached: ConcertStateCache | undefined,
  song: SuggestedSongView,
): ConcertStateCache | undefined {
  if (cached === undefined) return cached;
  const isAlreadyInPool = cached.state.pool.some((entry) => entry.songId === song.id);
  if (isAlreadyInPool) return cached;
  return {
    ...cached,
    state: {
      ...cached.state,
      pool: [
        ...cached.state.pool,
        {
          songId: song.id,
          title: song.title,
          artist: song.artist,
          status: song.status,
          voteCount: NO_VOTES_YET,
          isSuggestion: true,
        },
      ],
    },
  };
}

export function withOpenedRound(
  cached: ConcertStateCache | undefined,
  round: RoundView,
): ConcertStateCache | undefined {
  if (cached === undefined) return cached;
  return {
    ...cached,
    state: {
      ...cached.state,
      round,
      ownVotes: [],
      ballotCount: NO_VOTES_YET,
      pool: cached.state.pool.map((entry) => ({ ...entry, voteCount: NO_VOTES_YET })),
    },
  };
}

export interface RoundHistoryCache {
  readonly rounds: readonly RoundView[];
}

export function withRoundAppended(
  cached: RoundHistoryCache | undefined,
  round: RoundView,
): RoundHistoryCache | undefined {
  if (cached === undefined) return cached;
  return { rounds: [...cached.rounds, round] };
}
