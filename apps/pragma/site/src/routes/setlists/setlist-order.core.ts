/** @Feature setlists */

export const ORDER_BACK_PARAM = 'back';
const SESSION_PATH_PATTERN = /^\/sessions\/[\w-]+$/;

// @FollowsBlueprint core-decision
export function selectOrderExitPath(setlistId: string, requestedBack: string | null): string {
  // Stryker disable next-line ConditionalExpression: equivalent mutant. RegExp.test reads null as the text "null", which the session path pattern never matches, so dropping the null guard returns the same setlist path.
  if (requestedBack !== null && SESSION_PATH_PATTERN.test(requestedBack)) return requestedBack;
  return `/setlists/${setlistId}`;
}

export function buildOrderAddressFromSession(setlistId: string, sessionId: string): string {
  return `/setlists/${setlistId}/order?${new URLSearchParams({ [ORDER_BACK_PARAM]: `/sessions/${sessionId}` }).toString()}`;
}
