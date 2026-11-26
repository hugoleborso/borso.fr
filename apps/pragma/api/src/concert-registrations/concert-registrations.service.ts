import { randomBytes, randomUUID } from 'node:crypto';
import { canonicalizeEmail, isDisposableEmail } from '@domain/registration-email.core';
import { PRAGMA_REQUEST_HEADERS } from '@domain/request-headers.core';
import { getMembersSortedByFirstName } from '../members/members.service';
import { findSongById, getSongs, resolveCatalogueSongForTrack } from '../songs/songs.service';
import { mintChartGetUrl, mintObjectUpload } from '../uploads/uploads.service';
import {
  buildPosterObjectKey,
  EDIT_TOKEN_BYTES,
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
  type AnnouncementUpdateShape,
  type ConcertAnnouncementRow,
  countRegistrationsOfConcerts,
  findConcertAnnouncement,
  findRegistrationHoldingToken,
  insertRegistration,
  listConcertsFrom,
  listDistinctWishedSongIds,
  listRegistrationsOfConcert,
  type RegistrationAnswerShape,
  updateConcertAnnouncement,
  updateRegistrationAnswers,
} from './concert-registrations.repository';
import {
  type AllowedPosterContentType,
  type MemberNameView,
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
      registrationCount: countBySessionId.get(concert.id) ?? NO_REGISTRATION,
    })),
  );
}

export async function listMemberNames(): Promise<MemberNameView[]> {
  const members = await getMembersSortedByFirstName();
  return members.map((member) => ({ id: member.id, firstName: member.firstName }));
}

export interface RegisterParams {
  readonly sessionId: string;
  readonly firstName: string;
  readonly email: string;
  readonly now: Date;
}

export type RegisterOutcome = { kind: 'ok'; registrationId: string; editToken: string } | Refused;

// @FollowsBlueprint service-orchestration
export async function register(params: RegisterParams): Promise<RegisterOutcome> {
  const concert = await findConcertAnnouncement(params.sessionId);
  if (!isUpcomingConcert(concert, params.now)) return refuse('not-an-upcoming-concert');
  if (isDisposableEmail(params.email)) return refuse('disposable-email');
  const editToken = encodeEditToken(randomBytes(EDIT_TOKEN_BYTES));
  const inserted = await insertRegistration({
    sessionId: params.sessionId,
    firstName: params.firstName,
    email: params.email,
    canonicalEmail: canonicalizeEmail(params.email),
    editTokenHash: hashEditToken(editToken),
    comingForMemberId: null,
    wishedSongId: null,
    registeredAt: params.now,
  });
  if (inserted === null) return refuse('already-registered');
  return { kind: 'ok', registrationId: inserted.id, editToken };
}

export interface AmendRegistrationParams {
  readonly registrationId: string;
  readonly editToken: string;
  readonly comingForMemberId?: string | null;
  readonly wishedTrackId?: string;
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

async function readWishedSong(trackId: string | undefined): Promise<AnswerRead> {
  if (trackId === undefined) return { kind: 'ok', answers: {} };
  const resolution = await resolveCatalogueSongForTrack(trackId);
  if (resolution.kind === 'unavailable') return refuse('external-search-unavailable');
  if (resolution.kind === 'unknown') return refuse('unknown-track');
  return { kind: 'ok', answers: { wishedSongId: resolution.song.id } };
}

async function readWishedSongView(songId: string | null): Promise<WishedSongView | null> {
  if (songId === null) return null;
  return projectWishedSong(await findSongById(songId));
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
  const comingFor = await readComingFor(params.comingForMemberId);
  if (comingFor.kind === 'refused') return comingFor;
  const wishedSong = await readWishedSong(params.wishedTrackId);
  if (wishedSong.kind === 'refused') return wishedSong;
  const updated = await updateRegistrationAnswers(params.registrationId, {
    ...comingFor.answers,
    ...wishedSong.answers,
  });
  const registration = updated ?? holder;
  return {
    kind: 'ok',
    registration: {
      comingForMemberId: registration.comingForMemberId,
      wishedSong: await readWishedSongView(registration.wishedSongId),
    },
  };
}

export interface AnnouncementView {
  readonly message: string | null;
  readonly posterUrl: string | null;
}

export type AnnouncementOutcome = { kind: 'ok'; announcement: AnnouncementView } | Refused;

async function projectAnnouncement(
  concert: ConcertAnnouncementRow,
  now: Date,
): Promise<AnnouncementView> {
  return {
    message: concert.publicMessage,
    posterUrl: await mintPosterUrl(concert.posterS3Key, now),
  };
}

export async function readAnnouncement(sessionId: string, now: Date): Promise<AnnouncementOutcome> {
  const concert = await findConcertAnnouncement(sessionId);
  if (!isConcert(concert)) return refuse('not-a-concert');
  return { kind: 'ok', announcement: await projectAnnouncement(concert, now) };
}

export interface PatchAnnouncementParams {
  readonly sessionId: string;
  readonly message?: string | null;
  readonly posterS3Key?: string | null;
  readonly now: Date;
}

function toAnnouncementUpdate(params: PatchAnnouncementParams): AnnouncementUpdateShape {
  return {
    ...(params.message === undefined ? {} : { publicMessage: params.message }),
    ...(params.posterS3Key === undefined ? {} : { posterS3Key: params.posterS3Key }),
  };
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
