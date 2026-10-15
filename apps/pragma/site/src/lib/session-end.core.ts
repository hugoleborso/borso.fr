/** @Feature auth */

const UNAUTHORISED_STATUS = 401;

const ENDED_SESSION_ERRORS: ReadonlySet<unknown> = new Set(['session-required', 'session-invalid']);

export function canAnswerEndedSession(status: number): boolean {
  return status === UNAUTHORISED_STATUS;
}

// @FollowsBlueprint core-decision
export function isEndedSessionBody(body: unknown): boolean {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false;
  return ENDED_SESSION_ERRORS.has(body.error);
}
