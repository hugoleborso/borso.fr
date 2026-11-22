// @FollowsBlueprint core-decision
export function selectAllowedOrigin(
  requestOrigin: string,
  siteOrigin: string | null,
): string | null {
  return siteOrigin !== null && requestOrigin === siteOrigin ? requestOrigin : null;
}
