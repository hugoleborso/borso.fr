import { z } from 'zod';
import { parseJsonOrNull } from '../helpers/json/json.core';

export interface RecurringTask {
  readonly id: string;
  readonly title: string;
  readonly cadence: string;
  readonly routine: string;
  readonly what: string;
  readonly lastRunOn: string | null;
  readonly nextRunOn: string;
  readonly isDue: boolean;
}

export interface RecurringTasks {
  readonly generatedAt: string | null;
  readonly tasks: RecurringTask[];
}

const TITLE_FIELD = 'titre';

const recurringFileSchema = z.object({
  genere: z.string().nullish(),
  taches: z.array(z.unknown()),
});

const recurringTaskSchema = z.object({
  id: z.string().min(1),
  [TITLE_FIELD]: z.string().min(1),
  cadence: z.string(),
  routine: z.string(),
  quoi: z.string(),
  dernier: z.iso.date().nullish(),
  prochain: z.iso.date(),
  due: z.boolean(),
});

const NO_RECURRING_TASKS: RecurringTasks = { generatedAt: null, tasks: [] };

function readRecurringTask(entry: unknown): RecurringTask | null {
  const taskEntry = recurringTaskSchema.safeParse(entry);
  if (!taskEntry.success) return null;
  const { id, cadence, routine, quoi, dernier, prochain, due } = taskEntry.data;
  return {
    id,
    title: taskEntry.data[TITLE_FIELD],
    cadence,
    routine,
    what: quoi,
    lastRunOn: dernier ?? null,
    nextRunOn: prochain,
    isDue: due,
  };
}

// @FollowsBlueprint core-parse-untrusted
export function parseRecurringTasks(raw: string | null): RecurringTasks {
  // Stryker disable next-line ConditionalExpression: equivalent mutant, a missing state parses to null and fails the schema below exactly like this early answer.
  if (raw === null) return NO_RECURRING_TASKS;
  const recurringFile = recurringFileSchema.safeParse(parseJsonOrNull(raw));
  if (!recurringFile.success) return NO_RECURRING_TASKS;
  return {
    generatedAt: recurringFile.data.genere ?? null,
    tasks: recurringFile.data.taches
      .map((entry) => readRecurringTask(entry))
      .filter((task) => task !== null),
  };
}
