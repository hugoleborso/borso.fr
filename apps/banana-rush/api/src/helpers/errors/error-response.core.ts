import { type GameErrorCode, type GameErrorStatus, isGameError } from './game-error.types';

const UNEXPECTED_FAILURE_STATUS = 500;

export interface ErrorResponse {
  readonly body: { readonly error: GameErrorCode | 'unexpected-failure' };
  readonly status: GameErrorStatus | typeof UNEXPECTED_FAILURE_STATUS;
}

/**
 * @Blueprint core-failure-to-response
 * @BlueprintName Core Failure To Response
 * @BlueprintUsage Use for the one decision an error handler makes, so the composition root that installs it carries no branch of its own.
 * @BlueprintDescription Turns any thrown value into the body and the status the client receives, as a pure function, which is what lets the whole failure contract be tested without a request. A value that is not one of the application's own refusals answers the unexpected failure code and never carries its message outward, because a message that escaped a slice was not written for anybody to read.
 */
export function selectErrorResponse(failure: unknown): ErrorResponse {
  if (isGameError(failure)) return { body: { error: failure.code }, status: failure.status };
  return { body: { error: 'unexpected-failure' }, status: UNEXPECTED_FAILURE_STATUS };
}
