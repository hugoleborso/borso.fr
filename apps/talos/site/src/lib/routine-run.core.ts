import { RECENT_ROUTINE_RUN_LIMIT } from '@domain/routine-run.core';

const ROUTINE_UNCONFIGURED_STATUS = 503;

const TRIGGER_LABEL_KEY = {
  message: 'message.runs.trigger.message',
  proposition: 'message.runs.trigger.proposition',
} as const;

export type RoutineRunTrigger = keyof typeof TRIGGER_LABEL_KEY;

// @FollowsBlueprint core-decision
export function isRoutineUnconfigured(failure: unknown): boolean {
  if (typeof failure !== 'object' || failure === null || !('status' in failure)) return false;
  return failure.status === ROUTINE_UNCONFIGURED_STATUS;
}

export function placeNewestRunFirst<Run>(runs: readonly Run[], newestRun: Run): Run[] {
  return [newestRun, ...runs].slice(0, RECENT_ROUTINE_RUN_LIMIT);
}

export function selectTriggerLabelKey(
  trigger: RoutineRunTrigger,
): (typeof TRIGGER_LABEL_KEY)[RoutineRunTrigger] {
  return TRIGGER_LABEL_KEY[trigger];
}
