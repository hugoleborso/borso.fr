/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';
import {
  asSearchableIsrc,
  basicAuthorization,
  buildIsrcSearchUrl,
  isTokenUsable,
  nonBlank,
  readCredentials,
  readFirstTrackId,
  readSpotifyToken,
  selectResolvableIsrc,
} from './spotify.core';

const NOW = 1_000_000;
const HOUR_IN_SECONDS = 3_600;
const SAFETY_SECONDS = 60;

describe('readSpotifyToken', () => {
  it('folds the granted lifetime into an instant, short of what Spotify allowed', () => {
    expect(readSpotifyToken({ access_token: 'abc', expires_in: HOUR_IN_SECONDS }, NOW)).toEqual({
      accessToken: 'abc',
      expiresAtMillis: NOW + (HOUR_IN_SECONDS - SAFETY_SECONDS) * 1_000,
    });
  });

  it('refuses a payload that is not a token grant', () => {
    expect(readSpotifyToken({ error: 'invalid_client' }, NOW)).toBeNull();
    expect(readSpotifyToken(null, NOW)).toBeNull();
  });

  it('refuses an empty access token, which would authorise nothing', () => {
    expect(readSpotifyToken({ access_token: '', expires_in: HOUR_IN_SECONDS }, NOW)).toBeNull();
  });

  it('refuses a lifetime that is not positive', () => {
    expect(readSpotifyToken({ access_token: 'abc', expires_in: 0 }, NOW)).toBeNull();
  });
});

describe('isTokenUsable', () => {
  it('refuses a token nobody has', () => {
    expect(isTokenUsable(null, NOW)).toBe(false);
  });

  it('accepts a token whose instant is still ahead', () => {
    expect(isTokenUsable({ accessToken: 'abc', expiresAtMillis: NOW + 1 }, NOW)).toBe(true);
  });

  it('refuses a token that expires exactly now', () => {
    expect(isTokenUsable({ accessToken: 'abc', expiresAtMillis: NOW }, NOW)).toBe(false);
  });
});

describe('readFirstTrackId', () => {
  it('names the single track the ISRC matched', () => {
    expect(readFirstTrackId({ tracks: { items: [{ id: 'track-1' }, { id: 'track-2' }] } })).toBe(
      'track-1',
    );
  });

  it('names nothing when Spotify carries no track for that ISRC', () => {
    expect(readFirstTrackId({ tracks: { items: [] } })).toBeNull();
  });

  it('names nothing when the response carries no tracks block at all', () => {
    expect(readFirstTrackId({})).toBeNull();
  });

  it('names nothing when the payload is not a search response', () => {
    expect(readFirstTrackId({ tracks: 'nope' })).toBeNull();
    expect(readFirstTrackId(null)).toBeNull();
  });
});

describe('asSearchableIsrc', () => {
  it('accepts the shape the standard defines, upper-cased', () => {
    expect(asSearchableIsrc('usqx91300108')).toBe('USQX91300108');
  });

  it('trims the surrounding space a stored value may carry', () => {
    expect(asSearchableIsrc('  USQX91300108  ')).toBe('USQX91300108');
  });

  it('refuses anything that could change what the query asks', () => {
    expect(asSearchableIsrc('USQX9130010"')).toBeNull();
    expect(asSearchableIsrc('USQX91300108 OR x')).toBeNull();
  });

  it('refuses a value of the wrong length', () => {
    expect(asSearchableIsrc('USQX9130010')).toBeNull();
    expect(asSearchableIsrc('USQX913001080')).toBeNull();
  });

  it('refuses a country prefix that is not two letters', () => {
    expect(asSearchableIsrc('1SQX91300108')).toBeNull();
  });

  it('refuses a year and serial that are not seven digits', () => {
    expect(asSearchableIsrc('USQX9130010A')).toBeNull();
  });
});

describe('selectResolvableIsrc', () => {
  it('names the first value Spotify could be asked about', () => {
    expect(selectResolvableIsrc(['not-an-isrc', 'USQX91300108'])).toBe('USQX91300108');
  });

  it('names nothing when the song carries no usable identifier', () => {
    expect(selectResolvableIsrc(['not-an-isrc'])).toBeNull();
    expect(selectResolvableIsrc([])).toBeNull();
  });
});

describe('readCredentials', () => {
  it('splits the stored value on its first colon, since a secret may carry one', () => {
    expect(readCredentials('id-1:secret:with:colons')).toEqual({
      clientId: 'id-1',
      clientSecret: 'secret:with:colons',
    });
  });

  it('trims the surrounding space a parameter store round trip can add', () => {
    expect(readCredentials(' id-1 : secret-1 ')).toEqual({
      clientId: 'id-1',
      clientSecret: 'secret-1',
    });
  });

  it('refuses a value nobody stored', () => {
    expect(readCredentials(undefined)).toBeNull();
  });

  it('refuses a value naming no pair', () => {
    expect(readCredentials('no-colon-here')).toBeNull();
  });

  it('refuses a pair whose id half is empty', () => {
    expect(readCredentials(':secret-only')).toBeNull();
    expect(readCredentials('   :secret-only')).toBeNull();
  });

  it('refuses a pair whose secret half is empty', () => {
    expect(readCredentials('id-only:')).toBeNull();
    expect(readCredentials('id-only:   ')).toBeNull();
  });
});

describe('nonBlank', () => {
  it('passes a value through', () => {
    expect(nonBlank('set')).toBe('set');
  });

  it('reads an empty variable as an absent one, which is what a blank deploy input leaves', () => {
    expect(nonBlank('')).toBeUndefined();
  });

  it('leaves an absent variable absent', () => {
    expect(nonBlank(undefined)).toBeUndefined();
  });
});

describe('basicAuthorization', () => {
  it('encodes the pair the way the OAuth basic scheme expects', () => {
    expect(basicAuthorization({ clientId: 'id-1', clientSecret: 'secret-1' })).toBe(
      `Basic ${Buffer.from('id-1:secret-1').toString('base64')}`,
    );
  });
});

describe('buildIsrcSearchUrl', () => {
  it('asks for the ISRC as a filter rather than as free text', () => {
    expect(buildIsrcSearchUrl('https://api.spotify.com/v1/search', 'USQX91300108', 1)).toBe(
      'https://api.spotify.com/v1/search?q=isrc%3AUSQX91300108&type=track&limit=1',
    );
  });
});
