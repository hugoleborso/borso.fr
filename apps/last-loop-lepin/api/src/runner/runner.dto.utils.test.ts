import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Runner } from './runner.types';
import { readPhotosCdnHost, toRunnerDto } from './runner.dto.utils';

const SAMPLE_RUNNER: Runner = {
  editionSlug: 'lepin-2026',
  slug: 'borso',
  displayName: 'Borso',
  photoKey: 'lepin-2026/borso/abc.thumb.jpg',
  bib: 1,
};

describe('toRunnerDto', () => {
  it('composes photoUrl from cdnHost + photoKey when both are present', () => {
    const dto = toRunnerDto(SAMPLE_RUNNER, 'photos-cdn.borso.fr');
    expect(dto).toEqual({
      editionSlug: 'lepin-2026',
      slug: 'borso',
      displayName: 'Borso',
      photoKey: 'lepin-2026/borso/abc.thumb.jpg',
      photoUrl: 'https://photos-cdn.borso.fr/lepin-2026/borso/abc.thumb.jpg',
      bib: 1,
    });
  });

  it('returns photoUrl=null when photoKey is null', () => {
    const dto = toRunnerDto({ ...SAMPLE_RUNNER, photoKey: null }, 'photos-cdn.borso.fr');
    expect(dto.photoUrl).toBeNull();
  });

  it('returns photoUrl=null when cdnHost is undefined', () => {
    const dto = toRunnerDto(SAMPLE_RUNNER, undefined);
    expect(dto.photoUrl).toBeNull();
  });

  it('returns photoUrl=null when cdnHost is the empty string', () => {
    const dto = toRunnerDto(SAMPLE_RUNNER, '');
    expect(dto.photoUrl).toBeNull();
  });

  it('strips leading slashes from photoKey so the composed URL never carries a double slash', () => {
    const dto = toRunnerDto(
      { ...SAMPLE_RUNNER, photoKey: '///lepin-2026/borso/x.jpg' },
      'photos-cdn.borso.fr',
    );
    expect(dto.photoUrl).toBe('https://photos-cdn.borso.fr/lepin-2026/borso/x.jpg');
  });
});

describe('readPhotosCdnHost', () => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env.PHOTOS_CDN_HOST;
  });

  afterEach(() => {
    if (saved === undefined) {
      delete process.env.PHOTOS_CDN_HOST;
    } else {
      process.env.PHOTOS_CDN_HOST = saved;
    }
  });

  it('returns the env var when set to a non-empty string', () => {
    process.env.PHOTOS_CDN_HOST = 'photos-cdn.borso.fr';
    expect(readPhotosCdnHost()).toBe('photos-cdn.borso.fr');
  });

  it('returns undefined when the env var is missing', () => {
    delete process.env.PHOTOS_CDN_HOST;
    expect(readPhotosCdnHost()).toBeUndefined();
  });

  it('returns undefined when the env var is set to the empty string', () => {
    process.env.PHOTOS_CDN_HOST = '';
    expect(readPhotosCdnHost()).toBeUndefined();
  });
});
