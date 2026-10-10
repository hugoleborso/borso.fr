export const JOIN_CODE_LENGTH = 4;

const CHARACTERS_OUTSIDE_A_JOIN_CODE = /[^A-Z0-9]/gu;

// @FollowsBlueprint domain-shared-selection
export function normalizeJoinCode(raw: string): string {
  return raw.toUpperCase().replaceAll(CHARACTERS_OUTSIDE_A_JOIN_CODE, '');
}

export function isCompleteJoinCode(normalizedCode: string): boolean {
  return normalizedCode.length === JOIN_CODE_LENGTH;
}
