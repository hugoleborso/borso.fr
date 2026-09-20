import { UNKNOWN_FAILURE_CODE } from './api-failure.core';

export interface CodedRejection {
  readonly code: string;
}

function hasACode(failure: object): failure is CodedRejection {
  return 'code' in failure && typeof failure.code === 'string';
}

/**
 * @Blueprint core-code-for-any-rejection
 * @BlueprintName Core Code For Any Rejection
 * @BlueprintUsage Use wherever a screen turns a rejected request into something a reader can see.
 * @BlueprintDescription Answers a code for every rejection, not only for the ones the API named. A request that never reached the server — a preflight the gateway refused, a dropped connection, a certificate a phone will not trust — rejects with an ordinary `TypeError` carrying no code, and a screen that maps only the API's own refusals to a message renders nothing at all for those: a blank page where a failure belongs, which reads as a server that answered nothing rather than a request that never left. Reserving `null` for the absence of a rejection is what keeps the caller free of a conditional — it hands the query's `error` straight over and gets a sentence exactly when there is something to say.
 */
export function readRejectionCode(failure: unknown): string | null {
  if (failure === null || failure === undefined) return null;
  if (typeof failure !== 'object') return UNKNOWN_FAILURE_CODE;
  return hasACode(failure) ? failure.code : UNKNOWN_FAILURE_CODE;
}
