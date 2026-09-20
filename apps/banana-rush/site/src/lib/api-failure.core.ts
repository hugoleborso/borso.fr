import { z } from 'zod';

const failureSchema = z.object({ error: z.string() });

export const UNKNOWN_FAILURE_CODE = 'unexpected-failure';

/**
 * @Blueprint core-failure-code-from-an-untrusted-body
 * @BlueprintName Core Failure Code From An Untrusted Body
 * @BlueprintUsage Use where a failed response carries a machine readable reason the interface has to turn into a sentence.
 * @BlueprintDescription Parses the body with a schema instead of reaching into it, so a gateway that answered with its own HTML, or a body that never arrived, reaches the caller as the same unknown code rather than as a second failure inside the failure handler. Returning a code rather than a sentence is what keeps the language out of the API: the interface owns every sentence and the API owns every reason, and the two meet at this closed set of strings.
 */
export function readFailureCode(body: unknown): string {
  const failure = failureSchema.safeParse(body);
  return failure.success ? failure.data.error : UNKNOWN_FAILURE_CODE;
}
