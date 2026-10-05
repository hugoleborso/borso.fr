import type { ParseKeys } from 'i18next';
import type { ChipTone } from '../atoms/chip.variants';

export type TodoFilter = 'open' | 'done' | 'all';

export const TODO_FILTERS: readonly TodoFilter[] = ['open', 'done', 'all'];

export type DueStatus = 'none' | 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'settled';

export interface SchedulableTodo {
  readonly id: string;
  readonly text: string;
  readonly done: boolean;
  readonly dueDate?: string;
  readonly doneOn?: string;
}

const LAST_DAY = '9999-12-31';
const FIRST_DAY = '0000-01-01';

const FILTER_PREDICATE: Readonly<Record<TodoFilter, (todo: SchedulableTodo) => boolean>> = {
  open: (todo) => !todo.done,
  done: (todo) => todo.done,
  all: () => true,
};

function compareOpenTodos(left: SchedulableTodo, right: SchedulableTodo): number {
  return (left.dueDate ?? LAST_DAY).localeCompare(right.dueDate ?? LAST_DAY);
}

function compareDoneTodos(left: SchedulableTodo, right: SchedulableTodo): number {
  return (right.doneOn ?? FIRST_DAY).localeCompare(left.doneOn ?? FIRST_DAY);
}

function compareTodos(left: SchedulableTodo, right: SchedulableTodo): number {
  if (left.done !== right.done) return left.done ? 1 : -1;
  return left.done ? compareDoneTodos(left, right) : compareOpenTodos(left, right);
}

// @FollowsBlueprint core-view-projection
export function selectVisibleTodos<Todo extends SchedulableTodo>(
  todos: readonly Todo[],
  filter: TodoFilter,
): Todo[] {
  return todos.filter(FILTER_PREDICATE[filter]).toSorted(compareTodos);
}

export function countOpenTodos(todos: readonly SchedulableTodo[]): number {
  return todos.filter(FILTER_PREDICATE.open).length;
}

export function selectDueStatus(
  todo: Pick<SchedulableTodo, 'done' | 'dueDate'>,
  today: string,
  tomorrow: string,
): DueStatus {
  if (todo.done) return 'settled';
  if (todo.dueDate === undefined) return 'none';
  if (todo.dueDate < today) return 'overdue';
  if (todo.dueDate === today) return 'today';
  return todo.dueDate === tomorrow ? 'tomorrow' : 'upcoming';
}

const DUE_TONE: Readonly<Record<DueStatus, ChipTone>> = {
  none: 'neutral',
  overdue: 'danger',
  today: 'warning',
  tomorrow: 'neutral',
  upcoming: 'neutral',
  settled: 'neutral',
};

export function selectDueTone(status: DueStatus): ChipTone {
  return DUE_TONE[status];
}

export type DueIcon = 'clock' | 'calendar';

const DUE_ICON: Readonly<Record<DueStatus, DueIcon>> = {
  none: 'calendar',
  overdue: 'clock',
  today: 'clock',
  tomorrow: 'calendar',
  upcoming: 'calendar',
  settled: 'calendar',
};

export function selectDueIcon(status: DueStatus): DueIcon {
  return DUE_ICON[status];
}

const DUE_LABEL_KEY: Readonly<Partial<Record<DueStatus, ParseKeys>>> = {
  overdue: 'todo.due.overdue',
  today: 'todo.due.today',
  tomorrow: 'todo.due.tomorrow',
};

export function describeDue(
  dueDate: string | undefined,
  status: DueStatus,
  translate: (key: ParseKeys, date: string) => string,
  formatDay: (isoDay: string) => string,
): string | null {
  if (dueDate === undefined) return null;
  const labelKey = DUE_LABEL_KEY[status];
  const day = formatDay(dueDate);
  return labelKey === undefined ? day : translate(labelKey, day);
}

const FILTER_LABEL_KEY: Readonly<Record<TodoFilter, ParseKeys>> = {
  open: 'todo.filter.open',
  done: 'todo.filter.done',
  all: 'todo.filter.all',
};

export function selectTodoFilterLabelKey(filter: TodoFilter): ParseKeys {
  return FILTER_LABEL_KEY[filter];
}

const EMPTY_LABEL_KEY: Readonly<Record<TodoFilter, ParseKeys>> = {
  open: 'todo.empty.open',
  done: 'todo.empty.done',
  all: 'todo.empty.all',
};

export function selectTodoEmptyLabelKey(filter: TodoFilter): ParseKeys {
  return EMPTY_LABEL_KEY[filter];
}

export function hasTodoTextChanged(original: string, draft: string): boolean {
  const trimmed = draft.trim();
  return trimmed.length > 0 && trimmed !== original;
}
