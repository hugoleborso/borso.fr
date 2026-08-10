import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readPhotosCdnHost } from './runner.environment';

describe('readPhotosCdnHost', () => {
  let savedHost: string | undefined;

  beforeEach(() => {
    savedHost = process.env.PHOTOS_CDN_HOST;
  });

  afterEach(() => {
    if (savedHost === undefined) {
      delete process.env.PHOTOS_CDN_HOST;
    } else {
      process.env.PHOTOS_CDN_HOST = savedHost;
    }
  });

  it('returns the environment variable when it is set to a non-empty string', () => {
    process.env.PHOTOS_CDN_HOST = 'photos-cdn.borso.fr';
    expect(readPhotosCdnHost()).toBe('photos-cdn.borso.fr');
  });

  it('returns undefined when the environment variable is missing', () => {
    delete process.env.PHOTOS_CDN_HOST;
    expect(readPhotosCdnHost()).toBeUndefined();
  });

  it('returns undefined when the environment variable is set to the empty string', () => {
    process.env.PHOTOS_CDN_HOST = '';
    expect(readPhotosCdnHost()).toBeUndefined();
  });
});
