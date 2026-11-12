import { RECENT_ROUTINE_RUN_LIMIT } from '@domain/routine-run.core';

const ROUTINE_UNCONFIGURED_STATUS = 503;

export const ROUTINE_RUN_LIST_ID = 'runs';
export const ROUTINE_RUN_LIST_PATH = `/message#${ROUTINE_RUN_LIST_ID}`;

export function isRunListAddressed(hash: string): boolean {
  return hash === `#${ROUTINE_RUN_LIST_ID}`;
}

const TRIGGER_LABEL_KEY = {
  message: 'message.runs.trigger.message',
  proposition: 'message.runs.trigger.proposition',
} as const;

export type RoutineRunTrigger = keyof typeof TRIGGER_LABEL_KEY;

// @FollowsBlueprint core-decision
export function isRoutineConfigured(failure: unknown): boolean {
  if (typeof failure !== 'object' || failure === null || !('status' in failure)) return true;
  return failure.status !== ROUTINE_UNCONFIGURED_STATUS;
}

export function placeNewestRunFirst<Run>(runs: readonly Run[], newestRun: Run): Run[] {
  return [newestRun, ...runs].slice(0, RECENT_ROUTINE_RUN_LIMIT);
}

export function selectTriggerLabelKey(
  trigger: RoutineRunTrigger,
): (typeof TRIGGER_LABEL_KEY)[RoutineRunTrigger] {
  return TRIGGER_LABEL_KEY[trigger];
}
