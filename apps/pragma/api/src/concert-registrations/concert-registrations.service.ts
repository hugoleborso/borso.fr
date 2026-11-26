import { randomBytes, randomUUID } from 'node:crypto';
import { projectConcertPrize, readConcertPrizeIcon } from '@domain/concert-prize.core';
import { canonicalizeEmail, isDisposableEmail } from '@domain/registration-email.core';
import { PRAGMA_REQUEST_HEADERS } from '@domain/request-headers.core';
import { getMembersSortedByFirstName } from '../members/members.service';
import { isLostInsertRace, isUniqueViolation } from '../helpers/persistence/conflict-abort.core';
import type { DatabaseExecutor } from '../database/client';
import { didClaimConcertWithin } from '../sessions/sessions.service';
import {
  type ExternalSongHit,
  findOrImportSuggestedSongWithin,
  findSongById,
  getSongs,
  readDeezerTrack,
} from '../songs/songs.service';
import { mintChartGetUrl, mintObjectUpload } from '../uploads/uploads.service';
import {
  type AnnouncementChanges,
  buildPosterObjectKey,
  EDIT_TOKEN_BYTES,
  toAnnouncementUpdate,
  encodeEditToken,
  hashEditToken,
  isConcert,
  isPosterKeyAcceptable,
  isUpcomingConcert,
  projectRegistrationList,
  projectWishedSong,
  startOfParisDay,
} from './concert-registrations.core';
import {
  type ConcertAnnouncementRow,
  type ConcertRegistrationRow,
  countRegistrationsOfConcerts,
  findConcertAnnouncement,
  findConcertAnnouncementWithin,
  findRegistrationHoldingToken,
  findRegistrationOfMailbox,
  insertRegistrationWithin,
  listConcertsFrom,
  listDistinctWishedSongIds,
  listRegistrationsOfConcert,
  type RegistrationAnswerShape,
  runInOneRegistrationTransaction,
  updateConcertAnnouncement,
  updateRegistrationAnswersWithin,
} from './concert-registrations.repository';
import {
  type AllowedPosterContentType,
  type AnnouncementView,
  type PublicMemberView,
  refuse,
  type Refused,
  type RegistrationListEntry,
  type UpcomingConcertView,
  type WishedSongView,
} from './concert-registrations.types';

const NO_REGISTRATION = 0;

export const REGISTRATION_TOKEN_HEADER = PRAGMA_REQUEST_HEADERS.registrationToken;

async function mintPosterUrl(posterS3Key: string | null, now: Date): Promise<string | null> {
  if (posterS3Key === null) return null;
  const minted = await mintChartGetUrl({ objectKey: posterS3Key, now });
  return minted.getUrl;
}

// @FollowsBlueprint service-read-model
export async function listUpcomingConcerts(now: Date): Promise<UpcomingConcertView[]> {
  const concerts = await listConcertsFrom(startOfParisDay(now));
  const counts = await countRegistrationsOfConcerts(concerts.map((concert) => concert.id));
  const countBySessionId = new Map(counts.map((row) => [row.sessionId, row.registrationCount]));
  return await Promise.all(
    concerts.map(async (concert) => ({
      sessionId: concert.id,
      date: concert.date.toISOString(),
      venue: concert.venue,
      message: concert.publicMessage,
      posterUrl: await mintPosterUrl(concert.posterS3Key, now),
      prize: projectConcertPrize(concert.prizeLabel, concert.prizeIcon),
      registrationCount: countBySessionId.get(concert.id) ?? NO_REGISTRATION,
    })),
  );
}

export async function listMemberNames(): Promise<PublicMemberView[]> {
  const members = await getMembersSortedByFirstName();
  return members.map(({ id, firstName, color }) => ({ id, firstName, color }));
}

export interface RegisterParams {
  readonly sessionId: string;
  readonly firstName: string;
  readonly email: string;
  readonly now: Date;
}

export type RegisterOutcome = { kind: 'ok'; registrationId: string; editToken: string } | Refused;

async function registerWithin(
  executor: DatabaseExecutor,
  params: RegisterParams,
  canonicalEmail: string,
): Promise<RegisterOutcome> {
  const isConcertClaimed = await didClaimConcertWithin(executor, params.sessionId);
  const concert = isConcertClaimed
    ? await findConcertAnnouncementWithin(executor, params.sessionId)
    : null;
  if (!isUpcomingConcert(concert, params.now)) return refuse('not-an-upcoming-concert');
  if (isDisposableEmail(params.email)) return refuse('disposable-email');
  const editToken = encodeEditToken(randomBytes(EDIT_TOKEN_BYTES));
  const inserted = await insertRegistrationWithin(executor, {
    sessionId: params.sessionId,
    firstName: params.firstName,
    email: params.email,
    canonicalEmail,
    editTokenHash: hashEditToken(editToken),
    comingForMemberId: null,
    wishedSongId: null,
    registeredAt: params.now,
  });
  if (inserted === null) return refuse('already-registered');
  return { kind: 'ok', registrationId: inserted.id, editToken };
}

// @FollowsBlueprint service-orchestration
export async function register(params: RegisterParams): Promise<RegisterOutcome> {
  const canonicalEmail = canonicalizeEmail(params.email);
  try {
    return await runInOneRegistrationTransaction(
      async (executor) => await registerWithin(executor, params, canonicalEmail),
    );
  } catch (error) {
    if (!isLostInsertRace(error)) throw error;
    const winner = await findRegistrationOfMailbox(params.sessionId, canonicalEmail);
    if (winner === null) throw error;
    return refuse('already-registered');
  }
}

export interface AmendRegistrationParams {
  readonly registrationId: string;
  readonly editToken: string;
  readonly comingForMemberId?: string | null;
  readonly wishedTrackId?: string;
  readonly now: Date;
}

export interface RegistrationAnswersView {
  readonly comingForMemberId: string | null;
  readonly wishedSong: WishedSongView | null;
}

export type AmendRegistrationOutcome =
  | { kind: 'ok'; registration: RegistrationAnswersView }
  | Refused;

type AnswerRead = { kind: 'ok'; answers: RegistrationAnswerShape } | Refused;

async function readComingFor(memberId: string | null | undefined): Promise<AnswerRead> {
  if (memberId === undefined) return { kind: 'ok', answers: {} };
  if (memberId === null) return { kind: 'ok', answers: { comingForMemberId: null } };
  const members = await getMembersSortedByFirstName();
  const isKnownMember = members.some((member) => member.id === memberId);
  if (!isKnownMember) return refuse('unknown-member');
  return { kind: 'ok', answers: { comingForMemberId: memberId } };
}

type WishedTrackRead = { kind: 'ok'; track: ExternalSongHit | null } | Refused;

async function readWishedTrack(trackId: string | undefined): Promise<WishedTrackRead> {
  if (trackId === undefined) return { kind: 'ok', track: null };
  const read = await readDeezerTrack(trackId);
  if (read.kind === 'unavailable') return refuse('external-search-unavailable');
  if (read.kind === 'unknown') return refuse('unknown-track');
  return { kind: 'ok', track: read.track };
}

async function resolveOrImportWishedSongWithin(
  executor: DatabaseExecutor,
  track: ExternalSongHit | null,
): Promise<RegistrationAnswerShape> {
  if (track === null) return {};
  const song = await findOrImportSuggestedSongWithin(executor, track);
  return { wishedSongId: song.id };
}

async function readWishedSongView(songId: string | null): Promise<WishedSongView | null> {
  if (songId === null) return null;
  return projectWishedSong(await findSongById(songId));
}

async function saveAnswers(
  registrationId: string,
  comingFor: RegistrationAnswerShape,
  track: ExternalSongHit | null,
): Promise<ConcertRegistrationRow | null> {
  return await runInOneRegistrationTransaction(async (executor) => {
    const wishedSong = await resolveOrImportWishedSongWithin(executor, track);
    return await updateRegistrationAnswersWithin(executor, registrationId, {
      ...comingFor,
      ...wishedSong,
    });
  });
}

async function saveAnswersAfterLostImportRace(
  registrationId: string,
  comingFor: RegistrationAnswerShape,
  track: ExternalSongHit | null,
): Promise<ConcertRegistrationRow | null> {
  try {
    return await saveAnswers(registrationId, comingFor, track);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    return await saveAnswers(registrationId, comingFor, track);
  }
}

// @FollowsBlueprint service-orchestration
export async function amendRegistration(
  params: AmendRegistrationParams,
): Promise<AmendRegistrationOutcome> {
  const holder = await findRegistrationHoldingToken(
    params.registrationId,
    hashEditToken(params.editToken),
  );
  if (holder === null) return refuse('invalid-registration-token');
  const concert = await findConcertAnnouncement(holder.sessionId);
  if (!isUpcomingConcert(concert, params.now)) return refuse('not-an-upcoming-concert');
  const comingFor = await readComingFor(params.comingForMemberId);
  if (comingFor.kind === 'refused') return comingFor;
  const wished = await readWishedTrack(params.wishedTrackId);
  if (wished.kind === 'refused') return wished;
  const registration = await saveAnswersAfterLostImportRace(
    params.registrationId,
    comingFor.answers,
    wished.track,
  );
  if (registration === null) return refuse('unknown-registration');
  return {
    kind: 'ok',
    registration: {
      comingForMemberId: registration.comingForMemberId,
      wishedSong: await readWishedSongView(registration.wishedSongId),
    },
  };
}

export type AnnouncementOutcome = { kind: 'ok'; announcement: AnnouncementView } | Refused;

async function projectAnnouncement(
  concert: ConcertAnnouncementRow,
  now: Date,
): Promise<AnnouncementView> {
  return {
    message: concert.publicMessage,
    posterUrl: await mintPosterUrl(concert.posterS3Key, now),
    prizeLabel: concert.prizeLabel,
    prizeIcon: readConcertPrizeIcon(concert.prizeIcon),
  };
}

export async function readAnnouncement(sessionId: string, now: Date): Promise<AnnouncementOutcome> {
  const concert = await findConcertAnnouncement(sessionId);
  if (!isConcert(concert)) return refuse('not-a-concert');
  return { kind: 'ok', announcement: await projectAnnouncement(concert, now) };
}

export interface PatchAnnouncementParams extends AnnouncementChanges {
  readonly sessionId: string;
  readonly now: Date;
}

// @FollowsBlueprint service-orchestration
export async function patchAnnouncement(
  params: PatchAnnouncementParams,
): Promise<AnnouncementOutcome> {
  const concert = await findConcertAnnouncement(params.sessionId);
  if (!isConcert(concert)) return refuse('not-a-concert');
  if (!isPosterKeyAcceptable(params.posterS3Key, params.sessionId)) {
    return refuse('foreign-poster-key');
  }
  const updated = await updateConcertAnnouncement(params.sessionId, toAnnouncementUpdate(params));
  return { kind: 'ok', announcement: await projectAnnouncement(updated ?? concert, params.now) };
}

export interface MintPosterUploadParams {
  readonly sessionId: string;
  readonly contentType: AllowedPosterContentType;
  readonly byteSize: number;
  readonly now: Date;
}

export type PosterUploadOutcome = { kind: 'ok'; uploadUrl: string; s3Key: string } | Refused;

export async function mintPosterUpload(
  params: MintPosterUploadParams,
): Promise<PosterUploadOutcome> {
  const concert = await findConcertAnnouncement(params.sessionId);
  if (!isConcert(concert)) return refuse('not-a-concert');
  const objectKey = buildPosterObjectKey({
    sessionId: params.sessionId,
    contentType: params.contentType,
    randomId: randomUUID(),
  });
  const minted = await mintObjectUpload({
    objectKey,
    contentType: params.contentType,
    contentLength: params.byteSize,
    now: params.now,
  });
  return { kind: 'ok', uploadUrl: minted.uploadUrl, s3Key: minted.objectKey };
}

// @FollowsBlueprint service-read-model
export async function listRegistrations(sessionId: string): Promise<RegistrationListEntry[]> {
  const [registrations, members, songs] = await Promise.all([
    listRegistrationsOfConcert(sessionId),
    listMemberNames(),
    getSongs(),
  ]);
  return projectRegistrationList(registrations, members, songs);
}

export async function listFanWishSongIds(): Promise<string[]> {
  return await listDistinctWishedSongIds();
}
