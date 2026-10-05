import { createHash, timingSafeEqual } from 'node:crypto';

function digestForComparison(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

// @FollowsBlueprint utils-pure-module
export function areSecretsEqual(provided: string, expected: string): boolean {
  return timingSafeEqual(digestForComparison(provided), digestForComparison(expected));
}
