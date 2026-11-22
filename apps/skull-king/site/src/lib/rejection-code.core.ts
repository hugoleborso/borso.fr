import { UNKNOWN_FAILURE_CODE } from './api-failure.core';

export interface CodedRejection {
  readonly code: string;
}

function hasACode(failure: object): failure is CodedRejection {
  return 'code' in failure && typeof failure.code === 'string';
}

// @FollowsBlueprint core-code-for-any-rejection
export function readRejectionCode(failure: unknown): string | null {
  if (failure === null || failure === undefined) return null;
  if (typeof failure !== 'object') return UNKNOWN_FAILURE_CODE;
  return hasACode(failure) ? failure.code : UNKNOWN_FAILURE_CODE;
}
