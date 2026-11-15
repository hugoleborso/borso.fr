const HTTPS_PROTOCOL = 'https:';

// @FollowsBlueprint core-decision
export function isHttpsAddress(address: string): boolean {
  if (!URL.canParse(address)) return false;
  return new URL(address).protocol === HTTPS_PROTOCOL;
}
