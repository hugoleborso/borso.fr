const UNAUTHORISED_STATUS = 401;

// @FollowsBlueprint core-decision
export function isEndedSessionFailure(failure: unknown): boolean {
  if (typeof failure !== 'object' || failure === null || !('status' in failure)) return false;
  return failure.status === UNAUTHORISED_STATUS;
}
