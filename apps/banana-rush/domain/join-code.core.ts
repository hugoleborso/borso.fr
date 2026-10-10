export const JOIN_CODE_LENGTH = 4;

// @FollowsBlueprint domain-shared-selection
export function normalizeJoinCode(raw: string): string {
  return raw.toUpperCase().replaceAll(/[^A-Z0-9]/gu, '');
}

export function isCompleteJoinCode(normalizedCode: string): boolean {
  return normalizedCode.length === JOIN_CODE_LENGTH;
}
