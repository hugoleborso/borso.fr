/**
 * Picks what the avatar renders, from the avatar the pure builder produced and
 * whether the photo has already failed to load. Returning both the photo URL
 * and the initials means the component holds no branch of its own.
 */

import type { RunnerAvatar } from '../../lib/runner-avatar.utils';

export interface RunnerAvatarView {
  readonly kind: 'photo' | 'initials';
  readonly photoUrl: string;
  readonly initials: string;
  readonly backgroundColor: string;
}

// @FollowsBlueprint core-view-intent
export function selectRunnerAvatarView(
  avatar: RunnerAvatar,
  hasPhotoFailed: boolean,
): RunnerAvatarView {
  if (avatar.kind === 'initials') {
    return {
      kind: 'initials',
      photoUrl: '',
      initials: avatar.initials,
      backgroundColor: avatar.backgroundColor,
    };
  }
  return {
    kind: hasPhotoFailed ? 'initials' : 'photo',
    photoUrl: avatar.url,
    initials: avatar.fallback.initials,
    backgroundColor: avatar.fallback.backgroundColor,
  };
}
