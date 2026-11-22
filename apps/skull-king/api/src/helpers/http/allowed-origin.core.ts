// @FollowsBlueprint core-decision
export function selectAllowedOrigin(
  requestOrigin: string,
  siteOrigin: string | null,
): string | null {
  return requestOrigin === siteOrigin ? requestOrigin : null;
}
