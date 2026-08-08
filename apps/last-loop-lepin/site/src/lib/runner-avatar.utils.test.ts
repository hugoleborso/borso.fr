import { describe, expect, it } from 'vitest';
import { buildRunnerAvatar } from './runner-avatar.utils';

describe('buildRunnerAvatar', () => {
  it('returns kind=photo with the URL and the pre-computed initials fallback when photoUrl is set', () => {
    const result = buildRunnerAvatar({
      displayName: 'Borso',
      photoUrl: 'https://photos-cdn.borso.fr/lepin-2026/borso/abcd.thumb.jpg',
    });
    expect(result.kind).toBe('photo');
    if (result.kind !== 'photo') throw new Error('narrow');
    expect(result.url).toBe('https://photos-cdn.borso.fr/lepin-2026/borso/abcd.thumb.jpg');
    expect(result.fallback.initials).toBe('BO');
    expect(result.fallback.backgroundColor).toMatch(/^oklch\(/);
  });

  it('returns kind=initials when photoUrl is null', () => {
    const result = buildRunnerAvatar({ displayName: 'Carla', photoUrl: null });
    expect(result.kind).toBe('initials');
    if (result.kind !== 'initials') throw new Error('narrow');
    expect(result.initials).toBe('CA');
    expect(result.backgroundColor).toMatch(/^oklch\(/);
  });

  it('treats empty-string photoUrl as null (defensive against an over-eager server composer)', () => {
    const result = buildRunnerAvatar({ displayName: 'Dora', photoUrl: '' });
    expect(result.kind).toBe('initials');
    if (result.kind !== 'initials') throw new Error('narrow');
    expect(result.initials).toBe('DO');
  });

  it('treats undefined photoUrl (older server response, deploy-gap absorption) as no-photo', () => {
    const result = buildRunnerAvatar({ displayName: 'Eve', photoUrl: undefined });
    expect(result.kind).toBe('initials');
  });

  it('falls back to "??" initials when displayName is blank', () => {
    const result = buildRunnerAvatar({ displayName: '   ', photoUrl: null });
    expect(result.kind).toBe('initials');
    if (result.kind !== 'initials') throw new Error('narrow');
    expect(result.initials).toBe('??');
  });
});
