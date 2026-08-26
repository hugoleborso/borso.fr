import { randomBytes } from 'node:crypto';
import { getSessionById } from '../sessions/sessions.service';
import {
  appendSongWithin,
  findOrCreateAudienceChoiceSetlist,
  getManualSetlistSongIdsOfSession,
  runInOneSetlistTransaction,
} from '../setlists/setlists.service';
import type { ExternalSongHit } from '../songs/musicbrainz.core';
import {
  createSong,
  getSongs,
  lookupExternalSong,
  searchExternalSongs,
  type SongRow,
} from '../songs/songs.service';
import {
  hasClaimedRoundForSettlement,
  deleteVote,
  findConcertWithOpenRound,
  findLatestRoundOfConcert,
  findOpenRoundOfConcert,
  findRoundById,
  insertRound,
  insertSuggestion,
  recordVote,
  listRoundsOfConcert,
  listSuggestedSongIdsOfConcert,
  listVotesOfRound,
  listWinningSongIdsOfConcert,
  type AudienceVoteRow,
  type VotingRoundRow,
} from './audience.repository';
import { type ConcertVoteState, refuse, type Refused, type RoundView } from './audience.types';
import { BALLOT_TOKEN_BYTES, mintBallotToken } from './ballot-token.utils';
import { buildPoolEntries, type PoolCandidateSong, selectPool, tallyVotes } from './pool.core';
import {
  isRoundOpen,
  remainingSeconds,
  selectRoundClosesAt,
  selectSettlementWrite,
  settleRound,
} from './round.core';

const CONCERT_SESSION_KIND = 'concert';
const NO_OWN_VOTES: readonly string[] = [];

export function mintBallot(): string {
  return mintBallotToken(randomBytes(BALLOT_TOKEN_BYTES));
}

function projectRound(round: VotingRoundRow, now: Date): RoundView {
  return {
    id: round.id,
    openedAt: round.openedAt.toISOString(),
    closesAt: round.closesAt.toISOString(),
    remainingSeconds: remainingSeconds(round, now),
    isOpen: isRoundOpen(round, now),
    isSettled: round.settledAt !== null,
    winningSongId: round.winningSongId,
  };
}

function toPoolCandidate(song: SongRow): PoolCandidateSong {
  return { id: song.id, title: song.title, artist: song.artist, status: song.status };
}

interface ConcertPool {
  readonly songs: readonly PoolCandidateSong[];
  readonly suggestedSongIds: readonly string[];
}

async function readConcertPool(sessionId: string): Promise<ConcertPool> {
  const [catalogSongs, manualSetlistSongIds, suggestedSongIds, previousWinnerSongIds] =
    await Promise.all([
      getSongs(),
      getManualSetlistSongIdsOfSession(sessionId),
      listSuggestedSongIdsOfConcert(sessionId),
      listWinningSongIdsOfConcert(sessionId),
    ]);
  const songs = selectPool({
    catalogSongs: catalogSongs.map((song) => toPoolCandidate(song)),
    manualSetlistSongIds,
    suggestedSongIds,
    previousWinnerSongIds,
  });
  return { songs, suggestedSongIds };
}

export interface OpenRoundParams {
  readonly sessionId: string;
  readonly now: Date;
}

export type OpenRoundOutcome = { kind: 'ok'; round: RoundView } | Refused;

// @FollowsBlueprint service-orchestration
export async function openRound(params: OpenRoundParams): Promise<OpenRoundOutcome> {
  const session = await getSessionById(params.sessionId);
  if (session === null) return refuse('not-a-concert');
  if (session.kind !== CONCERT_SESSION_KIND) return refuse('not-a-concert');
  const running = await findOpenRoundOfConcert(params.sessionId, params.now);
  if (running !== null) return refuse('round-already-open');
  await findOrCreateAudienceChoiceSetlist(params.sessionId);
  const round = await insertRound({
    sessionId: params.sessionId,
    openedAt: params.now,
    closesAt: selectRoundClosesAt(params.now),
  });
  return { kind: 'ok', round: projectRound(round, params.now) };
}

export interface RoundHistoryParams {
  readonly sessionId: string;
  readonly now: Date;
}

// @FollowsBlueprint service-read-model
export async function getRoundHistory(params: RoundHistoryParams): Promise<RoundView[]> {
  const rounds = await listRoundsOfConcert(params.sessionId);
  return rounds.map((round) => projectRound(round, params.now));
}

export async function findLiveConcert(now: Date): Promise<string | null> {
  return await findConcertWithOpenRound(now);
}

async function settleIfDue(round: VotingRoundRow, now: Date): Promise<void> {
  const settlement = settleRound({ round, votes: await listVotesOfRound(round.id), now });
  const write = selectSettlementWrite(settlement);
  if (!write.shouldClaimTheRound) return;
  const winningSongId = write.winningSongId;
  const setlist = await findOrCreateAudienceChoiceSetlist(round.sessionId);
  await runInOneSetlistTransaction(async (executor) => {
    const hasClaimedTheRound = await hasClaimedRoundForSettlement(
      executor,
      round.id,
      now,
      winningSongId,
    );
    if (!hasClaimedTheRound) return;
    if (winningSongId === null) return;
    await appendSongWithin(executor, setlist.id, winningSongId);
  });
}

function selectOwnVotes(
  votes: readonly AudienceVoteRow[],
  ballotToken: string | null,
): readonly string[] {
  if (ballotToken === null) return NO_OWN_VOTES;
  return votes.filter((vote) => vote.ballotToken === ballotToken).map((vote) => vote.songId);
}

function countBallots(votes: readonly AudienceVoteRow[]): number {
  return new Set(votes.map((vote) => vote.ballotToken)).size;
}

export interface ReadConcertStateParams {
  readonly sessionId: string;
  readonly ballotToken: string | null;
  readonly now: Date;
}

// @FollowsBlueprint service-orchestration
export async function readConcertState(
  params: ReadConcertStateParams,
): Promise<ConcertVoteState | null> {
  const session = await getSessionById(params.sessionId);
  if (session === null) return null;
  if (session.kind !== CONCERT_SESSION_KIND) return null;
  const lastKnownRound = await findLatestRoundOfConcert(params.sessionId);
  if (lastKnownRound !== null) await settleIfDue(lastKnownRound, params.now);
  const round = await reReadRound(lastKnownRound);
  const pool = await readConcertPool(params.sessionId);
  const votes = await readVotesOfRound(round);
  return {
    round: projectRoundOrNothing(round, params.now),
    pool: buildPoolEntries(pool.songs, tallyVotes(votes), pool.suggestedSongIds),
    ownVotes: selectOwnVotes(votes, params.ballotToken),
    ballotCount: countBallots(votes),
    capacity: session.capacity,
  };
}

async function reReadRound(round: VotingRoundRow | null): Promise<VotingRoundRow | null> {
  if (round === null) return null;
  return await findRoundById(round.id);
}

async function readVotesOfRound(round: VotingRoundRow | null): Promise<AudienceVoteRow[]> {
  if (round === null) return [];
  return await listVotesOfRound(round.id);
}

function projectRoundOrNothing(round: VotingRoundRow | null, now: Date): RoundView | null {
  if (round === null) return null;
  return projectRound(round, now);
}

type OpenRoundRead = { kind: 'ok'; round: VotingRoundRow } | Refused;

async function readOpenRound(roundId: string, now: Date): Promise<OpenRoundRead> {
  const round = await findRoundById(roundId);
  if (round === null) return refuse('round-closed');
  if (!isRoundOpen(round, now)) return refuse('round-closed');
  return { kind: 'ok', round };
}

export interface CastVoteParams {
  readonly roundId: string;
  readonly ballotToken: string;
  readonly songId: string;
  readonly now: Date;
}

export type VoteOutcome = { kind: 'ok' } | Refused;

// @FollowsBlueprint service-orchestration
export async function castVote(params: CastVoteParams): Promise<VoteOutcome> {
  const read = await readOpenRound(params.roundId, params.now);
  if (read.kind === 'refused') return read;
  const pool = await readConcertPool(read.round.sessionId);
  const isSongInPool = pool.songs.some((song) => song.id === params.songId);
  if (!isSongInPool) return refuse('song-not-in-pool');
  const write = await recordVote({
    roundId: params.roundId,
    ballotToken: params.ballotToken,
    songId: params.songId,
    castAt: params.now,
  });
  if (write === 'already-present') return refuse('duplicate-vote');
  return { kind: 'ok' };
}

export interface RetractVoteParams {
  readonly roundId: string;
  readonly ballotToken: string;
  readonly songId: string;
  readonly now: Date;
}

export async function retractVote(params: RetractVoteParams): Promise<VoteOutcome> {
  const read = await readOpenRound(params.roundId, params.now);
  if (read.kind === 'refused') return read;
  await deleteVote(params.roundId, params.ballotToken, params.songId);
  return { kind: 'ok' };
}

export interface SearchForSuggestionParams {
  readonly query: string;
  readonly now: Date;
}

export type SuggestionSearchOutcome = { kind: 'ok'; hits: ExternalSongHit[] } | Refused;

export async function searchForSuggestion(
  params: SearchForSuggestionParams,
): Promise<SuggestionSearchOutcome> {
  const outcome = await searchExternalSongs({ query: params.query, now: params.now });
  if (outcome.kind === 'unavailable') return refuse('external-search-unavailable');
  return { kind: 'ok', hits: outcome.hits };
}

export interface AcceptSuggestionParams {
  readonly sessionId: string;
  readonly ballotToken: string;
  readonly musicBrainzId: string;
  readonly now: Date;
}

type SongResolution = { kind: 'ok'; song: SongRow } | Refused;

async function importSuggestedSong(musicBrainzId: string): Promise<SongResolution> {
  const outcome = await lookupExternalSong(musicBrainzId);
  if (outcome.kind === 'unavailable') return refuse('external-search-unavailable');
  const hit = outcome.hits.find((candidate) => candidate.mbid === musicBrainzId);
  if (hit === undefined) return refuse('unknown-suggestion');
  const song = await createSong({
    title: hit.title,
    artist: hit.artist,
    status: 'idea',
    links: [],
    chart: null,
    tonalityStart: null,
    tonalityEnd: null,
    defaultLineup: {},
    baseEnergy: null,
    mbid: hit.mbid,
    album: hit.album,
    durationSeconds: hit.durationSeconds,
    isrcs: [...hit.isrcs],
    tags: [...hit.tags],
    structureNotes: '',
    gimmickNotes: '',
    notes: '',
  });
  return { kind: 'ok', song };
}

async function resolveSuggestedSong(musicBrainzId: string): Promise<SongResolution> {
  const catalogSongs = await getSongs();
  const known = catalogSongs.find((song) => song.mbid === musicBrainzId);
  if (known === undefined) return await importSuggestedSong(musicBrainzId);
  return { kind: 'ok', song: known };
}

export type SuggestionOutcome = { kind: 'ok'; song: SongRow } | Refused;

// @FollowsBlueprint service-orchestration
export async function acceptSuggestion(params: AcceptSuggestionParams): Promise<SuggestionOutcome> {
  const manualSetlistSongIds = await getManualSetlistSongIdsOfSession(params.sessionId);
  const resolution = await resolveSuggestedSong(params.musicBrainzId);
  if (resolution.kind === 'refused') return resolution;
  const isAlreadyPlannedTonight = manualSetlistSongIds.includes(resolution.song.id);
  if (isAlreadyPlannedTonight) return refuse('song-already-planned');
  await insertSuggestion({
    sessionId: params.sessionId,
    songId: resolution.song.id,
    ballotToken: params.ballotToken,
    suggestedAt: params.now,
  });
  return resolution;
}
