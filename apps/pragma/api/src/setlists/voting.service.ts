import { findSetlistById } from './setlists.repository';
import { resolveSetlistStatus, SETLIST_LOCKED, SETLIST_VOTING } from './setlists.core';
import {
  computeBudget,
  type ScoreWriteIntent,
  selectScoreWriteIntent,
  selectTargetSongCount,
  selectWriteOutcome,
  type WriteOutcome,
  judgeScore,
  proposeClosing,
  resolveTargetSongCount,
  type SongTally,
  tally,
  type VoteBudget,
} from './voting.core';
import type { DatabaseExecutor } from '../database/client';
import {
  deleteVote,
  deleteVotesOfMember,
  deleteVotesOfSong,
  listVotesOfMember,
  listVotesOfSetlist,
  replaceEntriesWithProposal,
  updateVoteStatus,
  upsertVote,
} from './voting.repository';

export async function deleteVotesOfDeletedMember(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await deleteVotesOfMember(executor, memberId);
}

export async function deleteVotesOfDeletedSong(
  executor: DatabaseExecutor,
  songId: string,
): Promise<void> {
  await deleteVotesOfSong(executor, songId);
}

export interface VoteBoard {
  readonly status: 'voting' | 'locked';
  readonly targetSongCount: number;
  readonly budget: VoteBudget;
  readonly tallies: SongTally[];
}

export type VoteBoardOutcome = { kind: 'ok'; board: VoteBoard } | { kind: 'setlist-not-found' };

// @FollowsBlueprint service-orchestration
export async function readVoteBoard(
  setlistId: string,
  memberId: string,
): Promise<VoteBoardOutcome> {
  const setlist = await findSetlistById(setlistId);
  if (setlist === null) return { kind: 'setlist-not-found' };
  const [allVotes, votesOfMember] = await Promise.all([
    listVotesOfSetlist(setlistId),
    listVotesOfMember(setlistId, memberId),
  ]);
  return {
    kind: 'ok',
    board: {
      status: resolveSetlistStatus(setlist.status),
      targetSongCount: resolveTargetSongCount(setlist.targetSongCount),
      budget: computeBudget(setlist.targetSongCount, votesOfMember),
      tallies: tally(allVotes),
    },
  };
}

export type VoteStatusOutcome = { kind: 'ok' } | { kind: 'setlist-not-found' };

export async function setVoteStatus(params: {
  readonly setlistId: string;
  readonly status: 'voting' | 'locked';
  readonly targetSongCount: number | null;
}): Promise<VoteStatusOutcome> {
  const setlist = await findSetlistById(params.setlistId);
  if (setlist === null) return { kind: 'setlist-not-found' };
  const target = selectTargetSongCount(params.targetSongCount, setlist.targetSongCount);
  const updated = await updateVoteStatus(params.setlistId, params.status, target);
  return STATUS_OUTCOME_BY_WRITE[selectWriteOutcome(updated)];
}

const STATUS_OUTCOME_BY_WRITE: Readonly<Record<WriteOutcome, VoteStatusOutcome>> = {
  missing: { kind: 'setlist-not-found' },
  written: { kind: 'ok' },
};

export type ScoreOutcome =
  | { kind: 'ok'; budget: VoteBudget }
  | { kind: 'setlist-not-found' }
  | { kind: 'not-voting' }
  | { kind: 'budget-exhausted'; budget: VoteBudget };

export async function scoreSong(params: {
  readonly setlistId: string;
  readonly memberId: string;
  readonly songId: string;
  readonly points: number;
  readonly now: Date;
}): Promise<ScoreOutcome> {
  const setlist = await findSetlistById(params.setlistId);
  if (setlist === null) return { kind: 'setlist-not-found' };
  if (resolveSetlistStatus(setlist.status) !== SETLIST_VOTING) return { kind: 'not-voting' };
  const votesOfMember = await listVotesOfMember(params.setlistId, params.memberId);
  const verdict = judgeScore(setlist.targetSongCount, votesOfMember, params.songId, params.points);
  if (verdict.kind === 'budget-exhausted') {
    return { kind: 'budget-exhausted', budget: verdict.budget };
  }
  const write = WRITE_BY_INTENT[selectScoreWriteIntent(params.points)];
  await write(params);
  return { kind: 'ok', budget: verdict.budget };
}

const WRITE_BY_INTENT: Readonly<
  Record<
    ScoreWriteIntent,
    (params: {
      setlistId: string;
      memberId: string;
      songId: string;
      points: number;
      now: Date;
    }) => Promise<void>
  >
> = {
  remove: async (params) => {
    await deleteVote(params.setlistId, params.memberId, params.songId);
  },
  store: async (params) => {
    await upsertVote({
      setlistId: params.setlistId,
      memberId: params.memberId,
      songId: params.songId,
      points: params.points,
      updatedAt: params.now,
    });
  },
};

export type ProposalOutcome =
  | { kind: 'ok'; tallies: SongTally[] }
  | { kind: 'setlist-not-found' }
  | { kind: 'not-voting' }
  | { kind: 'no-votes' };

export async function readClosingProposal(setlistId: string): Promise<ProposalOutcome> {
  const setlist = await findSetlistById(setlistId);
  if (setlist === null) return { kind: 'setlist-not-found' };
  if (resolveSetlistStatus(setlist.status) !== SETLIST_VOTING) return { kind: 'not-voting' };
  const tallies = tally(await listVotesOfSetlist(setlistId));
  if (tallies.length === 0) return { kind: 'no-votes' };
  return { kind: 'ok', tallies: proposeClosing(tallies, setlist.targetSongCount) };
}

export type CloseOutcome = { kind: 'ok' } | { kind: 'setlist-not-found' } | { kind: 'not-voting' };

export async function closeVote(params: {
  readonly setlistId: string;
  readonly songIds: readonly string[];
}): Promise<CloseOutcome> {
  const setlist = await findSetlistById(params.setlistId);
  if (setlist === null) return { kind: 'setlist-not-found' };
  if (resolveSetlistStatus(setlist.status) !== SETLIST_VOTING) return { kind: 'not-voting' };
  await replaceEntriesWithProposal(params.setlistId, params.songIds, SETLIST_LOCKED);
  return { kind: 'ok' };
}
