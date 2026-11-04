import type { StaleScope } from '@domain/stale-scope.core';
import { selectFailureCode } from '../mcp/tool-result.core';

export const BROADCAST_FAILED = 'RealtimeBroadcastFailed';
export const BROADCAST_LATE = 'RealtimeBroadcastLate';

export type BroadcastOutcome =
  | { readonly kind: 'delivered' }
  | { readonly kind: 'late' }
  | { readonly kind: 'failed'; readonly error: unknown };

export interface BroadcastFailure {
  readonly name: string;
  readonly tags: Readonly<Record<string, string>>;
}

// @FollowsBlueprint core-decision
export function listRejectionReasons(
  deliveries: readonly PromiseSettledResult<unknown>[],
): unknown[] {
  return deliveries.flatMap((delivery): unknown[] => {
    if (delivery.status === 'fulfilled') return [];
    const reason: unknown = delivery.reason;
    return [reason];
  });
}

export function selectBroadcastFailure(
  outcome: BroadcastOutcome,
  scope: StaleScope,
): BroadcastFailure | null {
  if (outcome.kind === 'late') return { name: BROADCAST_LATE, tags: { 'realtime.scope': scope } };
  if (outcome.kind === 'delivered') return null;
  return {
    name: BROADCAST_FAILED,
    tags: { 'realtime.scope': scope, 'realtime.code': selectFailureCode(outcome.error) },
  };
}
