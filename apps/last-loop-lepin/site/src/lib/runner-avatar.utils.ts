/**
 * Pure builder for the avatar contract consumed by `<RunnerAvatar>` (and the
 * Leaflet `divIcon` mirror in `course-map.utils.ts`). Returns a discriminated
 * union so the renderer can branch once and treat each case as a value:
 *
 *   - `{ kind: 'photo', url, fallback }` — there's a `photoUrl` to render;
 *     the `fallback` field carries the pre-computed initials avatar so the
 *     consumer can swap on `<img onError>` without re-hashing the name.
 *   - `{ kind: 'initials', initials, backgroundColor }` — no photo, render
 *     the initials avatar straight away.
 */

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

/** The photo variant, whose block display keeps a broken image from leaking whitespace. */
export const RUNNER_AVATAR_PHOTO_CLASS = `${AVATAR_FRAME_CLASS} block object-cover object-center`;

export const RUNNER_AVATAR_INITIALS_CLASS = `${AVATAR_FRAME_CLASS} inline-flex items-center justify-center font-bold uppercase text-[12px] text-bg`;

/** The same disc as `RUNNER_AVATAR_INITIALS_CLASS`, ringed so it reads over map tiles. */
export const MAP_AVATAR_CLASS = `${RUNNER_AVATAR_INITIALS_CLASS} font-display border-2 border-bg shadow-[0_1px_4px_rgba(0,0,0,0.25)]`;

export const MAP_AVATAR_PHOTO_CLASS = 'block object-cover object-center';

export interface RunnerAvatarInput {
  readonly displayName: string;
  /**
   * The DTO carries `photoUrl?: string | null` because the Zod schema
   * defaults a missing wire field to `null` (deploy-gap absorption); the
   * builder accepts the same shape and treats `undefined`, `null`, and
   * `''` all as "no photo".
   */
  readonly photoUrl?: string | null;
}

/**
 * Pick the avatar variant for a runner. Pure — same inputs always yield
 * the same output. `undefined`, `null`, and empty-string `photoUrl` all
 * cascade to initials (defensive against an over-eager server-side
 * composer; the DTO mapper returns `null` for missing keys, but coalescing
 * here gives a single source of truth).
 */
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
