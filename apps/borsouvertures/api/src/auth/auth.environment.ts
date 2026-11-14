const STAGE_VARIABLE = 'STAGE';
const STAGE_SERVED_OVER_PLAIN_HTTP = 'dev';

// @FollowsBlueprint environment-reader
export function isCookieSecure(): boolean {
  return process.env[STAGE_VARIABLE] !== STAGE_SERVED_OVER_PLAIN_HTTP;
}
