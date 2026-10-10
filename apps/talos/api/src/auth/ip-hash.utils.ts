import { createHash } from 'node:crypto';

// @FollowsBlueprint utils-pure-module
export function hashIp(ipAddress: string): string {
  return createHash('sha256').update(ipAddress).digest('hex');
}
