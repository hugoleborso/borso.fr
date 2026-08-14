import { describe, expect, it } from 'vitest';
import { selectRunnerAvatarView } from './runner-avatar-view.utils';

const INITIALS_AVATAR = {
  kind: 'initials',
  initials: 'AB',
  backgroundColor: 'oklch(0.72 0.14 200)',
} as const;

const PHOTO_AVATAR = {
  kind: 'photo',
  url: 'https://photos.example/alice.jpg',
  fallback: { initials: 'AL', backgroundColor: 'oklch(0.72 0.14 10)' },
} as const;

// @FollowsBlueprint test-pure-unit
describe('selectRunnerAvatarView', () => {
  it('renders initials when the runner has no photo', () => {
    expect(selectRunnerAvatarView(INITIALS_AVATAR, false)).toEqual({
      kind: 'initials',
      photoUrl: '',
      initials: 'AB',
      backgroundColor: 'oklch(0.72 0.14 200)',
    });
  });

  it('keeps rendering initials when the runner has no photo and a failure was recorded', () => {
    expect(selectRunnerAvatarView(INITIALS_AVATAR, true).kind).toBe('initials');
  });

  it('renders the photo when the runner has one and it has not failed', () => {
    expect(selectRunnerAvatarView(PHOTO_AVATAR, false)).toEqual({
      kind: 'photo',
      photoUrl: 'https://photos.example/alice.jpg',
      initials: 'AL',
      backgroundColor: 'oklch(0.72 0.14 10)',
    });
  });

  it('falls back to the initials once the photo has failed to load', () => {
    const view = selectRunnerAvatarView(PHOTO_AVATAR, true);
    expect(view.kind).toBe('initials');
    expect(view.initials).toBe('AL');
  });
});
