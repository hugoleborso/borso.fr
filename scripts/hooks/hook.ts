// @FollowsBlueprint adapter-external-service
import { CHECKS_BY_EVENT } from './hook-events.ts';
import { runHook } from './hook-runner.adapter.ts';

runHook(CHECKS_BY_EVENT);
