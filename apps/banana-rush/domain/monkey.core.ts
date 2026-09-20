export const MONKEY_AVATARS = [
  'chimp',
  'gibbon',
  'macaque',
  'mandrill',
  'marmoset',
  'tamarin',
  'capuchin',
  'lemur',
] as const;

export type MonkeyAvatar = (typeof MONKEY_AVATARS)[number];

export const NICKNAME_MAX_LENGTH = 16;

// @FollowsBlueprint domain-shared-selection
export function isMonkeyAvatar(candidate: string): candidate is MonkeyAvatar {
  return MONKEY_AVATARS.some((avatar) => avatar === candidate);
}

export function selectFreeAvatars(taken: readonly string[]): readonly MonkeyAvatar[] {
  return MONKEY_AVATARS.filter((avatar) => !taken.includes(avatar));
}
