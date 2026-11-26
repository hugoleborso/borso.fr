import type { z } from 'zod';
import { CONCERT_KIND } from '@domain/upcoming-concerts.core';
import { mintBallotToken } from '../audience/ballot-token.utils';
import { parisCalendarDayOf, parisInstantAt } from '../helpers/paris-time/paris-time.core';
import { hashToken } from '../oauth/token.core';
import {
  type AllowedPosterContentType,
  type MemberNameView,
  POSTER_OBJECT_PREFIX,
  type RegistrationListEntry,
  type WishedSongView,
} from './concert-registrations.types';
import type { AnnouncementUpdateShape } from './concert-registrations.repository';
import type { announcementPatchSchema } from './concert-registrations.schema';

const MIDNIGHT_HOUR = 0;

const EXTENSION_BY_POSTER_CONTENT_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const satisfies Readonly<Record<AllowedPosterContentType, string>>;

export const EDIT_TOKEN_BYTES = 24;

export function encodeEditToken(randomBytes: Uint8Array): string {
  return mintBallotToken(randomBytes);
}

export function hashEditToken(editToken: string): string {
  return hashToken(editToken);
}

// @FollowsBlueprint core-decision
export function startOfParisDay(now: Date): Date {
  return parisInstantAt(parisCalendarDayOf(now), MIDNIGHT_HOUR);
}

export interface ConcertCandidate {
  readonly kind: string;
  readonly date: Date;
}

export function isUpcomingConcert(session: ConcertCandidate | null, now: Date): boolean {
  if (session === null) return false;
  if (session.kind !== CONCERT_KIND) return false;
  return session.date.getTime() >= startOfParisDay(now).getTime();
}

export function isConcert<Session extends ConcertCandidate>(
  session: Session | null,
): session is Session {
  return session?.kind === CONCERT_KIND;
}

export interface BuildPosterObjectKeyParams {
  readonly sessionId: string;
  readonly contentType: AllowedPosterContentType;
  readonly randomId: string;
}

export function buildPosterObjectKey(params: BuildPosterObjectKeyParams): string {
  const extension = EXTENSION_BY_POSTER_CONTENT_TYPE[params.contentType];
  return `${POSTER_OBJECT_PREFIX}/${params.sessionId}/${params.randomId}.${extension}`;
}

export function isPosterKeyAcceptable(
  objectKey: string | null | undefined,
  sessionId: string,
): boolean {
  if (objectKey === undefined || objectKey === null) return true;
  return objectKey.startsWith(`${POSTER_OBJECT_PREFIX}/${sessionId}/`);
}

export interface SongCandidate {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
}

export function projectWishedSong(song: SongCandidate | null): WishedSongView | null {
  if (song === null) return null;
  return { id: song.id, title: song.title, artist: song.artist };
}

export interface RegistrationCandidate {
  readonly id: string;
  readonly firstName: string;
  readonly email: string;
  readonly registeredAt: Date;
  readonly comingForMemberId: string | null;
  readonly wishedSongId: string | null;
}

function pickById<Item extends { readonly id: string }>(
  items: readonly Item[],
  id: string | null,
): Item | null {
  return items.find((item) => item.id === id) ?? null;
}

export function projectRegistrationList(
  registrations: readonly RegistrationCandidate[],
  members: readonly MemberNameView[],
  songs: readonly SongCandidate[],
): RegistrationListEntry[] {
  return registrations.map((registration) => {
    const member = pickById(members, registration.comingForMemberId);
    return {
      id: registration.id,
      firstName: registration.firstName,
      email: registration.email,
      registeredAt: registration.registeredAt.toISOString(),
      comingFor: member === null ? null : { id: member.id, firstName: member.firstName },
      wishedSong: projectWishedSong(pickById(songs, registration.wishedSongId)),
    };
  });
}

export type AnnouncementChanges = Readonly<z.infer<typeof announcementPatchSchema>>;

export function toAnnouncementUpdate({
  message,
  ...columnsNamedAlike
}: AnnouncementChanges): AnnouncementUpdateShape {
  return {
    ...columnsNamedAlike,
    ...(message === undefined ? {} : { publicMessage: message }),
  };
}
