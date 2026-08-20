import { type InitialsAvatar, initialsAvatar } from './initials.utils';

export type RunnerAvatarSurface = 'leaderboard' | 'map' | 'profile' | 'modal';

export type RunnerAvatar =
  | {
      readonly kind: 'photo';
      readonly url: string;
      readonly fallback: InitialsAvatar;
    }
  | {
      readonly kind: 'initials';
      readonly initials: string;
      readonly backgroundColor: string;
    };

const AVATAR_FRAME_CLASS = 'shrink-0 aspect-square overflow-hidden rounded-full align-middle';

export const RUNNER_AVATAR_PHOTO_CLASS = `${AVATAR_FRAME_CLASS} block object-cover object-center`;

export const RUNNER_AVATAR_INITIALS_CLASS = `${AVATAR_FRAME_CLASS} inline-flex items-center justify-center font-bold uppercase text-[12px] text-bg`;

export const MAP_AVATAR_CLASS = `${RUNNER_AVATAR_INITIALS_CLASS} font-display border-2 border-bg shadow-[0_1px_4px_rgba(0,0,0,0.25)]`;

export const MAP_AVATAR_PHOTO_CLASS = 'block object-cover object-center';

export interface RunnerAvatarInput {
  readonly displayName: string;
  readonly photoUrl?: string | null;
}

// @FollowsBlueprint utils-pure-module
export function buildRunnerAvatar(input: RunnerAvatarInput): RunnerAvatar {
  const initialsBranch = initialsAvatar(input.displayName);
  if (input.photoUrl === null || input.photoUrl === undefined || input.photoUrl === '') {
    return {
      kind: 'initials',
      initials: initialsBranch.initials,
      backgroundColor: initialsBranch.backgroundColor,
    };
  }
  return {
    kind: 'photo',
    url: input.photoUrl,
    fallback: initialsBranch,
  };
}
