/**
 * @DependsOnExternal spotify
 * @DependsOnExternal aws-ssm
 */

import { readSecureParameter } from '../helpers/secrets/parameter-store.client';
import {
  basicAuthorization,
  buildIsrcSearchUrl,
  isTokenUsable,
  nonBlank,
  readCredentials,
  readFirstTrackId,
  readSpotifyToken,
  selectResolvableIsrc,
  type SpotifyCredentials,
  type SpotifyToken,
} from './spotify.core';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_SEARCH_URL = 'https://api.spotify.com/v1/search';
const CREDENTIALS_PARAMETER_VARIABLE = 'SPOTIFY_CREDENTIALS_PARAMETER';
const CREDENTIALS_INLINE_VARIABLE = 'SPOTIFY_CREDENTIALS';
const SEARCH_LIMIT = 1;

export type ExternalFetcher = (url: string, init: RequestInit) => Promise<Response>;
export type ParameterReader = (parameterName: string) => Promise<string | undefined>;

export interface SpotifyState {
  token: SpotifyToken | null;
  credentials: SpotifyCredentials | null;
}

const spotifyState: SpotifyState = { token: null, credentials: null };

function readEnv(name: string): string | undefined {
  return nonBlank(process.env[name]);
}

export interface ResolveSpotifyOptions {
  readonly fetcher?: ExternalFetcher;
  readonly now?: () => number;
  readonly state?: SpotifyState;
  readonly readParameter?: ParameterReader;
}

async function fetchCredentials(
  readParameter: ParameterReader,
): Promise<SpotifyCredentials | null> {
  const inline = readCredentials(readEnv(CREDENTIALS_INLINE_VARIABLE));
  if (inline !== null) return inline;
  const parameterName = readEnv(CREDENTIALS_PARAMETER_VARIABLE);
  if (parameterName === undefined) return null;
  return readCredentials(await readParameter(parameterName));
}

async function mintToken(
  credentials: SpotifyCredentials,
  fetcher: ExternalFetcher,
  nowMillis: number,
): Promise<SpotifyToken | null> {
  const response = await fetcher(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthorization(credentials),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) return null;
  const body: unknown = await response.json();
  return readSpotifyToken(body, nowMillis);
}

/**
 * @Blueprint adapter-credentialed-lookup
 * @BlueprintName Adapter Over A Credentialed Web Service
 * @BlueprintUsage Use for the one file in a bounded context that calls a third-party service needing a secret and a minted token.
 * @BlueprintDescription Reads the credential once into module state so a warm instance never asks the parameter store twice, holds the token until its own recorded expiry, and takes the fetcher, the clock and the parameter reader as options so a test drives the whole flow without a network, a timer or an AWS call. Every failure answers null rather than throwing, because a missing Spotify link is not an error the caller who was saving a song can act on.
 * @DependsOnExternal spotify
 */
export async function resolveSpotifyTrackId(
  isrcs: readonly string[],
  options: ResolveSpotifyOptions = {},
): Promise<string | null> {
  const isrc = selectResolvableIsrc(isrcs);
  if (isrc === null) return null;
  const state = options.state ?? spotifyState;
  const now = options.now ?? Date.now;
  const fetcher = options.fetcher ?? fetch;
  const readParameter = options.readParameter ?? readSecureParameter;
  const credentials = state.credentials ?? (await fetchCredentials(readParameter));
  if (credentials === null) return null;
  state.credentials = credentials;
  const nowMillis = now();
  const hasUsableToken = isTokenUsable(state.token, nowMillis);
  const token = hasUsableToken ? state.token : await mintToken(credentials, fetcher, nowMillis);
  if (token === null) return null;
  state.token = token;
  const response = await fetcher(buildIsrcSearchUrl(SPOTIFY_SEARCH_URL, isrc, SEARCH_LIMIT), {
    headers: { Authorization: `Bearer ${token.accessToken}`, Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const body: unknown = await response.json();
  return readFirstTrackId(body);
}
