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
import { AudienceRefusedError, type ConcertVoteState, type RoundView } from './audience.types';
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

// @FollowsBlueprint service-orchestration
export async function openRound(params: OpenRoundParams): Promise<RoundView> {
  const session = await getSessionById(params.sessionId);
  if (session === null) throw new AudienceRefusedError('not-a-concert');
  if (session.kind !== CONCERT_SESSION_KIND) throw new AudienceRefusedError('not-a-concert');
  const running = await findOpenRoundOfConcert(params.sessionId, params.now);
  if (running !== null) throw new AudienceRefusedError('round-already-open');
  await findOrCreateAudienceChoiceSetlist(params.sessionId);
  const round = await insertRound({
    sessionId: params.sessionId,
    openedAt: params.now,
    closesAt: selectRoundClosesAt(params.now),
  });
  return projectRound(round, params.now);
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

async function readOpenRound(roundId: string, now: Date): Promise<VotingRoundRow> {
  const round = await findRoundById(roundId);
  if (round === null) throw new AudienceRefusedError('round-closed');
  if (!isRoundOpen(round, now)) throw new AudienceRefusedError('round-closed');
  return round;
}

export interface CastVoteParams {
  readonly roundId: string;
  readonly ballotToken: string;
  readonly songId: string;
  readonly now: Date;
}

// @FollowsBlueprint service-orchestration
export async function castVote(params: CastVoteParams): Promise<void> {
  const round = await readOpenRound(params.roundId, params.now);
  const pool = await readConcertPool(round.sessionId);
  const isSongInPool = pool.songs.some((song) => song.id === params.songId);
  if (!isSongInPool) throw new AudienceRefusedError('song-not-in-pool');
  const write = await recordVote({
    roundId: params.roundId,
    ballotToken: params.ballotToken,
    songId: params.songId,
    castAt: params.now,
  });
  if (write === 'already-present') throw new AudienceRefusedError('round-closed');
}

export interface RetractVoteParams {
  readonly roundId: string;
  readonly ballotToken: string;
  readonly songId: string;
  readonly now: Date;
}

export async function retractVote(params: RetractVoteParams): Promise<void> {
  await readOpenRound(params.roundId, params.now);
  await deleteVote(params.roundId, params.ballotToken, params.songId);
}

export interface SearchForSuggestionParams {
  readonly query: string;
  readonly now: Date;
}

export async function searchForSuggestion(
  params: SearchForSuggestionParams,
): Promise<ExternalSongHit[]> {
  const outcome = await searchExternalSongs({ query: params.query, now: params.now });
  if (outcome.kind === 'unavailable') throw new AudienceRefusedError('external-search-unavailable');
  return outcome.hits;
}

export interface AcceptSuggestionParams {
  readonly sessionId: string;
  readonly ballotToken: string;
  readonly musicBrainzId: string;
  readonly now: Date;
}

async function importSuggestedSong(musicBrainzId: string): Promise<SongRow> {
  const outcome = await lookupExternalSong(musicBrainzId);
  if (outcome.kind === 'unavailable') throw new AudienceRefusedError('external-search-unavailable');
  const hit = outcome.hits.find((candidate) => candidate.mbid === musicBrainzId);
  if (hit === undefined) throw new AudienceRefusedError('unknown-suggestion');
  return await createSong({
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
}

async function resolveSuggestedSong(musicBrainzId: string): Promise<SongRow> {
  const catalogSongs = await getSongs();
  const known = catalogSongs.find((song) => song.mbid === musicBrainzId);
  if (known === undefined) return await importSuggestedSong(musicBrainzId);
  return known;
}

// @FollowsBlueprint service-orchestration
export async function acceptSuggestion(params: AcceptSuggestionParams): Promise<SongRow> {
  const manualSetlistSongIds = await getManualSetlistSongIdsOfSession(params.sessionId);
  const song = await resolveSuggestedSong(params.musicBrainzId);
  const isAlreadyPlannedTonight = manualSetlistSongIds.includes(song.id);
  if (isAlreadyPlannedTonight) throw new AudienceRefusedError('song-already-planned');
  await insertSuggestion({
    sessionId: params.sessionId,
    songId: song.id,
    ballotToken: params.ballotToken,
    suggestedAt: params.now,
  });
  return song;
}
