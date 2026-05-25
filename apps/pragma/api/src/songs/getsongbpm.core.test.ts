/**
 * 100%-coverage gate for the GetSongBPM response mapper. The live API
 * is never hit — the test feeds the committed fixture (and a handful
 * of malformed / partial shapes) into the pure mapper.
 */

import { describe, expect, it } from 'vitest';
import FIXTURE from './__fixtures__/getsongbpm-sample.json';
import { parseGetSongBpmResponse } from './getsongbpm.core';

describe('parseGetSongBpmResponse', () => {
  it('maps a full upstream hit to the canonical short-form key', () => {
    const hit = parseGetSongBpmResponse(FIXTURE);
    expect(hit).toEqual({
      tonality: 'F#m',
      bpm: 116,
      durationSeconds: 369,
      timeSignature: '4/4',
    });
  });

  it('normalises "C major" to "C"', () => {
    const hit = parseGetSongBpmResponse({ search: [FIXTURE._variants.longFormKey] });
    expect(hit?.tonality).toBe('C');
  });

  it('normalises "Fmaj" to "F"', () => {
    const hit = parseGetSongBpmResponse({ search: [FIXTURE._variants.majShortForm] });
    expect(hit?.tonality).toBe('F');
  });

  it('normalises "F minor" to "Fm"', () => {
    const hit = parseGetSongBpmResponse({ search: [FIXTURE._variants.minorWord] });
    expect(hit?.tonality).toBe('Fm');
  });

  it('keeps a short-form minor key "C#m" verbatim', () => {
    const hit = parseGetSongBpmResponse({ search: [{ key_of: 'C#m', tempo: '120' }] });
    expect(hit?.tonality).toBe('C#m');
  });

  it('keeps a flat-root short-form minor key "Bbm" verbatim', () => {
    const hit = parseGetSongBpmResponse({ search: [{ key_of: 'Bbm', tempo: '120' }] });
    expect(hit?.tonality).toBe('Bbm');
  });

  it('passes unknown qualities through (e.g. "Dmaj7")', () => {
    const hit = parseGetSongBpmResponse({ search: [{ key_of: 'Dmaj7', tempo: '120' }] });
    expect(hit?.tonality).toBe('Dmaj7');
  });

  it('returns null tonality when key_of is missing', () => {
    const hit = parseGetSongBpmResponse({ search: [FIXTURE._variants.missingKey] });
    expect(hit?.tonality).toBe(null);
    expect(hit?.bpm).toBe(129);
  });

  it('returns null bpm when tempo is missing', () => {
    const hit = parseGetSongBpmResponse({ search: [FIXTURE._variants.missingTempo] });
    expect(hit?.bpm).toBe(null);
    expect(hit?.tonality).toBe('C');
  });

  it('returns null duration when duration is missing', () => {
    const hit = parseGetSongBpmResponse({ search: [FIXTURE._variants.missingDuration] });
    expect(hit?.durationSeconds).toBe(null);
  });

  it('parses a seconds-only duration string ("45" → 45)', () => {
    const hit = parseGetSongBpmResponse({ search: [FIXTURE._variants.secondsOnlyDuration] });
    expect(hit?.durationSeconds).toBe(45);
  });

  it('accepts numeric tempo and duration', () => {
    const hit = parseGetSongBpmResponse({
      search: [{ key_of: 'C', tempo: 120, duration: 200 }],
    });
    expect(hit?.bpm).toBe(120);
    expect(hit?.durationSeconds).toBe(200);
  });

  it('rounds fractional tempo and duration to integers', () => {
    const hit = parseGetSongBpmResponse({
      search: [{ key_of: 'C', tempo: '119.6', duration: '12.4' }],
    });
    expect(hit?.bpm).toBe(120);
    expect(hit?.durationSeconds).toBe(12);
  });

  it('rejects a non-positive bpm', () => {
    const hit = parseGetSongBpmResponse({
      search: [{ key_of: 'C', tempo: '0' }],
    });
    expect(hit?.bpm).toBe(null);
  });

  it('rejects a NaN bpm', () => {
    const hit = parseGetSongBpmResponse({
      search: [{ key_of: 'C', tempo: 'notanumber' }],
    });
    expect(hit?.bpm).toBe(null);
  });

  it('rejects a malformed mm:ss duration (3 parts)', () => {
    const hit = parseGetSongBpmResponse({
      search: [{ key_of: 'C', tempo: '120', duration: '1:02:03' }],
    });
    expect(hit?.durationSeconds).toBe(null);
  });

  it('rejects a duration with a non-numeric minute or second component', () => {
    const hitMinuteBad = parseGetSongBpmResponse({
      search: [{ key_of: 'C', tempo: '120', duration: 'a:30' }],
    });
    expect(hitMinuteBad?.durationSeconds).toBe(null);
    const hitSecondBad = parseGetSongBpmResponse({
      search: [{ key_of: 'C', tempo: '120', duration: '3:zz' }],
    });
    expect(hitSecondBad?.durationSeconds).toBe(null);
  });

  it('rejects a duration with negative components', () => {
    const hit = parseGetSongBpmResponse({
      search: [{ key_of: 'C', tempo: '120', duration: '-1:30' }],
    });
    expect(hit?.durationSeconds).toBe(null);
  });

  it('rejects a non-positive seconds-only duration', () => {
    const hit = parseGetSongBpmResponse({
      search: [{ key_of: 'C', tempo: '120', duration: '0' }],
    });
    expect(hit?.durationSeconds).toBe(null);
  });

  it('rejects a non-finite numeric duration', () => {
    const hit = parseGetSongBpmResponse({
      search: [{ key_of: 'C', tempo: '120', duration: Number.POSITIVE_INFINITY }],
    });
    expect(hit?.durationSeconds).toBe(null);
  });

  it('returns null when the payload shape is wrong', () => {
    expect(parseGetSongBpmResponse(null)).toBe(null);
    expect(parseGetSongBpmResponse('not-an-object')).toBe(null);
    expect(parseGetSongBpmResponse({ search: 'not-an-array' })).toBe(null);
  });

  it('returns null when the search array is empty', () => {
    expect(parseGetSongBpmResponse({ search: [] })).toBe(null);
  });

  it('returns null when the search field is absent', () => {
    expect(parseGetSongBpmResponse({})).toBe(null);
  });

  it('returns null when every useful field is empty / absent', () => {
    expect(parseGetSongBpmResponse({ search: [{}] })).toBe(null);
    expect(
      parseGetSongBpmResponse({
        search: [{ key_of: '', tempo: '', duration: '', time_sig: '' }],
      }),
    ).toBe(null);
  });

  it('keeps time_sig when only the signature is populated', () => {
    const hit = parseGetSongBpmResponse({
      search: [{ time_sig: '6/8' }],
    });
    expect(hit).toEqual({
      tonality: null,
      bpm: null,
      durationSeconds: null,
      timeSignature: '6/8',
    });
  });

  it('rejects a key that does not start with [A-G]', () => {
    const hit = parseGetSongBpmResponse({
      search: [{ key_of: 'Z#', tempo: '120' }],
    });
    expect(hit?.tonality).toBe(null);
  });
});
