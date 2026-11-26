import type { RateLimitBudget } from '../auth/rate-limit.utils';

export const CONCERT_REGISTRATION_REFUSALS = [
  'not-an-upcoming-concert',
  'not-a-concert',
  'already-registered',
  'disposable-email',
  'invalid-registration-token',
  'unknown-member',
  'unknown-track',
  'foreign-poster-key',
  'external-search-unavailable',
] as const;

export type ConcertRegistrationRefusal = (typeof CONCERT_REGISTRATION_REFUSALS)[number];

// @FollowsBlueprint domain-refusal-with-reason
export interface Refused {
  readonly kind: 'refused';
  readonly reason: ConcertRegistrationRefusal;
}

export function refuse(reason: ConcertRegistrationRefusal): Refused {
  return { kind: 'refused', reason };
}

export const ALLOWED_POSTER_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type AllowedPosterContentType = (typeof ALLOWED_POSTER_CONTENT_TYPES)[number];

const BYTES_PER_KIBIBYTE = 1_024;
const POSTER_MAX_MEBIBYTES = 10;

export const MAX_POSTER_BYTES = POSTER_MAX_MEBIBYTES * BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE;

export const POSTER_OBJECT_PREFIX = 'poster';

export interface WishedSongView {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
}

export interface MemberNameView {
  readonly id: string;
  readonly firstName: string;
}

export interface UpcomingConcertView {
  readonly sessionId: string;
  readonly date: string;
  readonly venue: string | null;
  readonly message: string | null;
  readonly posterUrl: string | null;
  readonly registrationCount: number;
}

export interface RegistrationListEntry {
  readonly id: string;
  readonly firstName: string;
  readonly email: string;
  readonly registeredAt: string;
  readonly comingFor: MemberNameView | null;
  readonly wishedSong: WishedSongView | null;
}

const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const RATE_LIMIT_WINDOW_MS = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export const CONCERT_REGISTRATION_READ_BUDGET: RateLimitBudget = {
  scope: 'concert-registration-read',
  maxAttempts: 120,
  windowMs: RATE_LIMIT_WINDOW_MS,
};

export const CONCERT_REGISTRATION_WRITE_BUDGET: RateLimitBudget = {
  scope: 'concert-registration-write',
  maxAttempts: 60,
  windowMs: RATE_LIMIT_WINDOW_MS,
};
