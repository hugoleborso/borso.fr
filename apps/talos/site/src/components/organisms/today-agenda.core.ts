import type { ParseKeys } from 'i18next';
import type { SchedulableTodo } from './todo-list.core';

export interface SchedulableCommitment {
  readonly path: string;
  readonly dueDate?: string;
}

export type AgendaEntry<Todo, Commitment> =
  | { readonly kind: 'todo'; readonly key: string; readonly todo: Todo }
  | { readonly kind: 'commitment'; readonly key: string; readonly commitment: Commitment };

export type AgendaBucket = 'overdue' | 'today' | 'tomorrow' | 'later' | 'undated';

export interface AgendaDay<Todo, Commitment> {
  readonly key: string;
  readonly bucket: AgendaBucket;
  readonly date?: string;
  readonly entries: AgendaEntry<Todo, Commitment>[];
}

const UNDATED_KEY = 'undated';
const LAST_DAY = '9999-12-31';
const OVERDUE_KEY = 'overdue';
const BUCKET_ORDER: Readonly<Record<AgendaBucket, number>> = {
  overdue: 0,
  today: 1,
  tomorrow: 2,
  later: 3,
  undated: 4,
};

function placeOnDay(
  dueDate: string | undefined,
  today: string,
  tomorrow: string,
): { readonly bucket: AgendaBucket; readonly key: string } {
  if (dueDate === undefined) return { bucket: 'undated', key: UNDATED_KEY };
  if (dueDate < today) return { bucket: 'overdue', key: OVERDUE_KEY };
  if (dueDate === today) return { bucket: 'today', key: dueDate };
  return { bucket: dueDate === tomorrow ? 'tomorrow' : 'later', key: dueDate };
}

function compareDays(
  left: AgendaDay<unknown, unknown>,
  right: AgendaDay<unknown, unknown>,
): number {
  const byBucket = BUCKET_ORDER[left.bucket] - BUCKET_ORDER[right.bucket];
  return byBucket === 0 ? left.key.localeCompare(right.key) : byBucket;
}

// @FollowsBlueprint core-view-projection
export function buildAgenda<Todo extends SchedulableTodo, Commitment extends SchedulableCommitment>(
  todos: readonly Todo[],
  commitments: readonly Commitment[],
  today: string,
  tomorrow: string,
): AgendaDay<Todo, Commitment>[] {
  const scheduledEntries: { dueDate: string | undefined; entry: AgendaEntry<Todo, Commitment> }[] =
    [
      ...todos
        .filter((todo) => !todo.done)
        .map((todo) => ({
          dueDate: todo.dueDate,
          entry: { kind: 'todo' as const, key: `todo:${todo.id}`, todo },
        })),
      ...commitments
        .filter((commitment) => commitment.dueDate !== undefined)
        .map((commitment) => ({
          dueDate: commitment.dueDate,
          entry: { kind: 'commitment' as const, key: `commitment:${commitment.path}`, commitment },
        })),
    ];
  const days = new Map<string, AgendaDay<Todo, Commitment>>();
  for (const { dueDate, entry } of scheduledEntries) {
    const { bucket, key } = placeOnDay(dueDate, today, tomorrow);
    const day = days.get(key) ?? {
      key,
      bucket,
      ...(bucket === 'later' ? { date: key } : {}),
      entries: [],
    };
    day.entries.push(entry);
    days.set(key, day);
  }
  return [...days.values()].toSorted(compareDays);
}

export function countOverdueTodos(todos: readonly SchedulableTodo[], today: string): number {
  return todos.filter((todo) => !todo.done && (todo.dueDate ?? LAST_DAY) < today).length;
}

const BUCKET_LABEL_KEY: Readonly<Record<Exclude<AgendaBucket, 'later'>, ParseKeys>> = {
  overdue: 'today.agenda.overdue',
  today: 'today.agenda.today',
  tomorrow: 'today.agenda.tomorrow',
  undated: 'today.agenda.undated',
};

export function describeAgendaDay(
  day: Pick<AgendaDay<unknown, unknown>, 'bucket' | 'date'>,
  translate: (key: ParseKeys) => string,
  formatDay: (isoDay: string) => string,
): string {
  if (day.bucket === 'later') return formatDay(day.date ?? '');
  return translate(BUCKET_LABEL_KEY[day.bucket]);
}

export function selectOverdueDay(
  bucket: AgendaBucket,
  dueDate: string | undefined,
  formatDay: (isoDay: string) => string,
): string | null {
  if (bucket !== 'overdue' || dueDate === undefined) return null;
  return formatDay(dueDate);
}

export function selectEarlierDay(date: string, today: string): string | null {
  return date === today ? null : date;
}
