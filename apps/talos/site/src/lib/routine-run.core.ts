export const ROUTINE_RUN_LIST_PATH = '/runs';

const TRIGGER_LABEL_KEY = {
  message: 'runs.trigger.message',
  proposition: 'runs.trigger.proposition',
} as const;

export type RoutineRunTrigger = keyof typeof TRIGGER_LABEL_KEY;

// @FollowsBlueprint core-view-intent
export function selectTriggerLabelKey(
  trigger: RoutineRunTrigger,
): (typeof TRIGGER_LABEL_KEY)[RoutineRunTrigger] {
  return TRIGGER_LABEL_KEY[trigger];
}
