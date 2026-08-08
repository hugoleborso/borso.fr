import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { toRunnerDto } from './runner.dto.utils';
import type { Runner } from './runner.types';

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
