import { describe, expect, it } from 'vitest';
import { buildRunnerAvatar } from './runner-avatar.utils';

// @FollowsBlueprint test-pure-unit
describe('buildRunnerAvatar', () => {
  it('returns kind=photo with the URL and the pre-computed initials fallback when photoUrl is set', () => {
    const avatar = buildRunnerAvatar({
      displayName: 'Borso',
      photoUrl: 'https://photos-cdn.borso.fr/lepin-2026/borso/abcd.thumb.jpg',
    });
    expect(avatar.kind).toBe('photo');
    if (avatar.kind !== 'photo') throw new Error('narrow');
    expect(avatar.url).toBe('https://photos-cdn.borso.fr/lepin-2026/borso/abcd.thumb.jpg');
    expect(avatar.fallback.initials).toBe('BO');
    expect(avatar.fallback.backgroundColor).toMatch(/^oklch\(/);
  });

  it('returns kind=initials when photoUrl is null', () => {
    const avatar = buildRunnerAvatar({ displayName: 'Carla', photoUrl: null });
    expect(avatar.kind).toBe('initials');
    if (avatar.kind !== 'initials') throw new Error('narrow');
    expect(avatar.initials).toBe('CA');
    expect(avatar.backgroundColor).toMatch(/^oklch\(/);
  });

  it('treats empty-string photoUrl as null (defensive against an over-eager server composer)', () => {
    const avatar = buildRunnerAvatar({ displayName: 'Dora', photoUrl: '' });
    expect(avatar.kind).toBe('initials');
    if (avatar.kind !== 'initials') throw new Error('narrow');
    expect(avatar.initials).toBe('DO');
  });

  it('treats undefined photoUrl (older server response, deploy-gap absorption) as no-photo', () => {
    const avatar = buildRunnerAvatar({ displayName: 'Eve', photoUrl: undefined });
    expect(avatar.kind).toBe('initials');
  });

  it('falls back to "??" initials when displayName is blank', () => {
    const avatar = buildRunnerAvatar({ displayName: '   ', photoUrl: null });
    expect(avatar.kind).toBe('initials');
    if (avatar.kind !== 'initials') throw new Error('narrow');
    expect(avatar.initials).toBe('??');
  });
});
