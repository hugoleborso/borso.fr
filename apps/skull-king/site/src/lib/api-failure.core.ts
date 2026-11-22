import { z } from 'zod';

const failureSchema = z.object({ error: z.string() });

export const UNKNOWN_FAILURE_CODE = 'unexpected-failure';

// @FollowsBlueprint core-failure-code-from-an-untrusted-body
export function readFailureCode(body: unknown): string {
  const failure = failureSchema.safeParse(body);
  return failure.success ? failure.data.error : UNKNOWN_FAILURE_CODE;
}
