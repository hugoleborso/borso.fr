import { readContentFile } from '../content/content.service';
import { parseRecurringTasks, type RecurringTasks } from './recurring-tasks.core';

const RECURRING_TASKS_PATH = 'etat/recurrentes.json';

// @FollowsBlueprint service-read-model
export async function readRecurringTasks(): Promise<RecurringTasks> {
  return parseRecurringTasks(await readContentFile(RECURRING_TASKS_PATH));
}
