import { z } from 'zod';

const MILLIS_PER_SECOND = 1_000;
const TOKEN_EXPIRY_SAFETY_SECONDS = 60;

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
});

const trackSchema = z.object({
  id: z.string().min(1),
});

const searchResponseSchema = z.object({
  tracks: z.object({ items: z.array(trackSchema).default([]) }).optional(),
});

export interface SpotifyToken {
  readonly accessToken: string;
  readonly expiresAtMillis: number;
}

// @FollowsBlueprint core-parse-untrusted
export function readSpotifyToken(payload: unknown, nowMillis: number): SpotifyToken | null {
  const grant = tokenResponseSchema.safeParse(payload);
  if (!grant.success) return null;
  const livesForSeconds = grant.data.expires_in - TOKEN_EXPIRY_SAFETY_SECONDS;
  return {
    accessToken: grant.data.access_token,
    expiresAtMillis: nowMillis + livesForSeconds * MILLIS_PER_SECOND,
  };
}

export function isTokenUsable(token: SpotifyToken | null, nowMillis: number): boolean {
  if (token === null) return false;
  return token.expiresAtMillis > nowMillis;
}

/**
 * @DependsOnExternal spotify
 */
export function readFirstTrackId(payload: unknown): string | null {
  const searchAnswer = searchResponseSchema.safeParse(payload);
  if (!searchAnswer.success) return null;
  return searchAnswer.data.tracks?.items[0]?.id ?? null;
}

const ISRC_PATTERN = /^[A-Za-z]{2}[A-Za-z0-9]{3}\d{7}$/;

export function asSearchableIsrc(candidate: string): string | null {
  const trimmed = candidate.trim();
  return ISRC_PATTERN.test(trimmed) ? trimmed.toUpperCase() : null;
}

export function selectResolvableIsrc(isrcs: readonly string[]): string | null {
  for (const candidate of isrcs) {
    const searchable = asSearchableIsrc(candidate);
    if (searchable !== null) return searchable;
  }
  return null;
}

export interface SpotifyCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
}

const CREDENTIALS_SEPARATOR = ':';

export function readCredentials(raw: string | undefined): SpotifyCredentials | null {
  if (raw === undefined) return null;
  const separatorAt = raw.indexOf(CREDENTIALS_SEPARATOR);
  // Stryker disable next-line EqualityOperator: equivalent mutant, since a separator at index 0 leaves an empty client id that the guard below already refuses; this one only has to catch the -1 that would make both slices nonsense
  if (separatorAt < 0) return null;
  const clientId = raw.slice(0, separatorAt).trim();
  const clientSecret = raw.slice(separatorAt + 1).trim();
  if (clientId.length === 0) return null;
  if (clientSecret.length === 0) return null;
  return { clientId, clientSecret };
}

export function nonBlank(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value.length === 0 ? undefined : value;
}

export function basicAuthorization(credentials: SpotifyCredentials): string {
  const pair = `${credentials.clientId}${CREDENTIALS_SEPARATOR}${credentials.clientSecret}`;
  return `Basic ${Buffer.from(pair).toString('base64')}`;
}

export function buildIsrcSearchUrl(searchOrigin: string, isrc: string, limit: number): string {
  return `${searchOrigin}?q=${encodeURIComponent(`isrc:${isrc}`)}&type=track&limit=${String(limit)}`;
}
