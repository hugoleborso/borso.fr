import { DefaultScheduler } from 'ts-fsrs';
import { type Scheduler, SCHEDULER_CONFIGURATION } from './scheduler.core';

const schedulerRequest: { pending: Promise<Scheduler> | undefined } = { pending: undefined };

// @FollowsBlueprint route-suspense-resource
export function readSchedulerRequest(): Promise<Scheduler> {
  schedulerRequest.pending ??= DefaultScheduler({
    ...SCHEDULER_CONFIGURATION,
    learningSteps: [...SCHEDULER_CONFIGURATION.learningSteps],
    relearningSteps: [...SCHEDULER_CONFIGURATION.relearningSteps],
  });
  return schedulerRequest.pending;
}
