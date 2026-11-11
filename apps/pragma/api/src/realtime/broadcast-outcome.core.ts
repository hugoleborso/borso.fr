import type { WrittenRoot } from '@domain/stale-scope.core';
import {
  describeThrownValue,
  type WideEventFields,
} from '../helpers/observability/wide-event.core';
import { selectFailureCode } from '../mcp/tool-result.core';

export const BROADCAST_FAILED = 'RealtimeBroadcastFailed';
export const BROADCAST_LATE = 'RealtimeBroadcastLate';
const WRITTEN_TAG_SEPARATOR = ',';
const OUTCOME_FIELD = 'realtime.broadcast_outcome';

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
  written: readonly WrittenRoot[],
): BroadcastFailure | null {
  const writtenTag = written.join(WRITTEN_TAG_SEPARATOR);
  if (outcome.kind === 'late')
    return { name: BROADCAST_LATE, tags: { 'realtime.written': writtenTag } };
  if (outcome.kind === 'delivered') return null;
  return {
    name: BROADCAST_FAILED,
    tags: { 'realtime.written': writtenTag, 'realtime.code': selectFailureCode(outcome.error) },
  };
}

export function buildBroadcastOutcomeFields(outcome: BroadcastOutcome): WideEventFields {
  if (outcome.kind !== 'failed') return { [OUTCOME_FIELD]: outcome.kind };
  const failure = describeThrownValue(outcome.error);
  return {
    [OUTCOME_FIELD]: outcome.kind,
    'realtime.broadcast_failure': [failure.type],
    'realtime.broadcast_failure_message': [failure.message],
  };
}
