import { describe, expect, it } from 'vitest';
import {
  normalizeTakeContentType,
  TAKE_COMMENT_MAX_LENGTH,
  TAKE_CONTENT_TYPES,
  TAKE_DURATION_MAX_SECONDS,
  TAKE_MAX_BYTES,
  TAKE_MAX_MEBIBYTES,
  takeFileExtensionOf,
  validateTakeFile,
} from './take-upload.core';

const ONE_MEBIBYTE = 1_048_576;

// @FollowsBlueprint test-pure-unit
describe('take upload limits', () => {
  it('caps a take at 50 MiB, counted in bytes', () => {
    expect(TAKE_MAX_MEBIBYTES).toBe(50);
    expect(TAKE_MAX_BYTES).toBe(50 * ONE_MEBIBYTE);
  });

  it('caps a take at four hours and a comment at 4 096 characters', () => {
    expect(TAKE_DURATION_MAX_SECONDS).toBe(14_400);
    expect(TAKE_COMMENT_MAX_LENGTH).toBe(4_096);
  });

  it('accepts what Safari, Chromium and Firefox record, and the usual audio files', () => {
    expect(TAKE_CONTENT_TYPES).toEqual([
      'audio/mp4',
      'audio/x-m4a',
      'audio/mpeg',
      'audio/webm',
      'audio/ogg',
      'audio/wav',
      'audio/aac',
    ]);
  });
});

describe('takeFileExtensionOf', () => {
  it('names a Safari recording .m4a, the extension both the stored object and the download use', () => {
    expect(takeFileExtensionOf('audio/mp4')).toBe('m4a');
  });

  it.each([
    ['audio/x-m4a', 'm4a'],
    ['audio/mpeg', 'mp3'],
    ['audio/webm', 'webm'],
    ['audio/ogg', 'ogg'],
    ['audio/wav', 'wav'],
    ['audio/aac', 'aac'],
  ] as const)('gives %s the extension %s', (contentType, extension) => {
    expect(takeFileExtensionOf(contentType)).toBe(extension);
  });
});

describe('normalizeTakeContentType', () => {
  it('drops the codec parameter Chromium and Firefox add to their recordings', () => {
    expect(normalizeTakeContentType('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(normalizeTakeContentType('audio/ogg; codecs=opus')).toBe('audio/ogg');
  });

  it('keeps the type Safari records under unchanged', () => {
    expect(normalizeTakeContentType('audio/mp4')).toBe('audio/mp4');
  });

  it('reads the type whatever its case and surrounding spaces', () => {
    expect(normalizeTakeContentType(' Audio/MPEG ')).toBe('audio/mpeg');
  });

  it('maps the older names of mp3 and wav files onto the accepted ones', () => {
    expect(normalizeTakeContentType('audio/mp3')).toBe('audio/mpeg');
    expect(normalizeTakeContentType('audio/x-wav')).toBe('audio/wav');
    expect(normalizeTakeContentType('audio/wave')).toBe('audio/wav');
    expect(normalizeTakeContentType('audio/vnd.wave')).toBe('audio/wav');
  });

  it('refuses anything that is not one of the accepted audio types', () => {
    expect(normalizeTakeContentType('video/webm')).toBeNull();
    expect(normalizeTakeContentType('application/pdf')).toBeNull();
    expect(normalizeTakeContentType('')).toBeNull();
  });
});

describe('validateTakeFile', () => {
  it('accepts an audio file up to exactly 50 MiB and answers its normalized type', () => {
    expect(validateTakeFile({ type: 'audio/webm;codecs=opus', size: TAKE_MAX_BYTES })).toEqual({
      kind: 'ok',
      contentType: 'audio/webm',
    });
  });

  it('refuses a file one byte over 50 MiB and names the limit', () => {
    expect(validateTakeFile({ type: 'audio/mpeg', size: TAKE_MAX_BYTES + 1 })).toEqual({
      kind: 'too-large',
      maxMebibytes: 50,
    });
  });

  it('refuses a file that is not audio before looking at its size', () => {
    expect(validateTakeFile({ type: 'image/png', size: TAKE_MAX_BYTES + 1 })).toEqual({
      kind: 'not-audio',
    });
  });

  it('refuses an empty file', () => {
    expect(validateTakeFile({ type: 'audio/mp4', size: 0 })).toEqual({ kind: 'empty' });
  });

  it('accepts a one-byte file', () => {
    expect(validateTakeFile({ type: 'audio/mp4', size: 1 })).toEqual({
      kind: 'ok',
      contentType: 'audio/mp4',
    });
  });
});
