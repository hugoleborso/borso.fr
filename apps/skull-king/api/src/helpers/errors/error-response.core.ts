import type { GameErrorCode } from '@domain/game-error.core';
import { type GameErrorStatus, isGameError } from './game-error.types';

const UNEXPECTED_FAILURE_STATUS = 500;

export interface ErrorResponse {
  readonly body: { readonly error: GameErrorCode | 'unexpected-failure' };
  readonly status: GameErrorStatus | typeof UNEXPECTED_FAILURE_STATUS;
}

// @FollowsBlueprint core-failure-to-response
export function selectErrorResponse(failure: unknown): ErrorResponse {
  if (isGameError(failure)) return { body: { error: failure.code }, status: failure.status };
  return { body: { error: 'unexpected-failure' }, status: UNEXPECTED_FAILURE_STATUS };
}
