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
