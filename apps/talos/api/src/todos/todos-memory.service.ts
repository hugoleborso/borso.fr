import type { TodoList } from '@domain/todo-list.core';
import { type NewTodo, parseTodos, type Todo, type TodoChanges } from '@domain/todo.core';
import { formatParisDate } from '../helpers/calendar/paris-clock.utils';
import { TalosError } from '../helpers/errors/talos-error.types';
import {
  findMemoryTodo,
  listMemoryTodos,
  readCreatedId,
  recordPwaChanges,
} from '../memory/memory-pwa.service';
import {
  describeTodoAddition,
  describeTodoChange,
  describeTodoRemoval,
  describeTodoRestoration,
  formatStoredTodoLine,
  isTaskTaken,
  matchRestoredTodo,
  projectStoredTodo,
  readStoredExtra,
  type RemovedTodo,
  type StoredTodo,
  type TodoRestoration,
} from './todos.core';

async function listVisibleTodos(list: TodoList): Promise<StoredTodo[]> {
  return (await listMemoryTodos(list.memoryList)).filter((stored) => !stored.removed);
}

async function readSavedTodo(id: string): Promise<Todo> {
  const stored = await findMemoryTodo(id);
  if (stored === null) throw new TalosError('todo-not-found');
  return projectStoredTodo(stored);
}

function getVisibleTodo(visible: readonly StoredTodo[], id: string): StoredTodo {
  const stored = visible.find((candidate) => candidate.id === id);
  if (stored === undefined) throw new TalosError('todo-not-found');
  return stored;
}

// @FollowsBlueprint service-orchestration
export async function listStoredTodos(list: TodoList): Promise<Todo[]> {
  return (await listVisibleTodos(list)).map(projectStoredTodo);
}

export async function addStoredTodo(list: TodoList, newTodo: NewTodo, now: Date): Promise<Todo> {
  const today = formatParisDate(now);
  if (isTaskTaken(await listVisibleTodos(list), newTodo.text, today)) {
    throw new TalosError('todo-duplicate');
  }
  const response = await recordPwaChanges(
    describeTodoAddition(list, newTodo.text),
    [
      {
        op: 'todo.add',
        list: list.memoryList,
        text: newTodo.text,
        addedOn: today,
        ...(newTodo.dueDate === undefined ? {} : { dueDate: newTodo.dueDate }),
      },
    ],
    now,
  );
  return await readSavedTodo(readCreatedId(response));
}

export async function changeStoredTodo(
  list: TodoList,
  id: string,
  changes: TodoChanges,
  now: Date,
): Promise<Todo> {
  const visible = await listVisibleTodos(list);
  const stored = getVisibleTodo(visible, id);
  const text = changes.text ?? stored.text;
  if (isTaskTaken(visible, text, stored.addedOn ?? undefined, id)) {
    throw new TalosError('todo-duplicate');
  }
  await recordPwaChanges(
    describeTodoChange(list, changes, text),
    [
      {
        op: 'todo.update',
        id,
        ...(changes.text === undefined ? {} : { text: changes.text }),
        ...(changes.done === undefined ? {} : { done: changes.done }),
        ...(changes.dueDate === undefined ? {} : { dueDate: changes.dueDate }),
      },
    ],
    now,
  );
  return await readSavedTodo(id);
}

export async function deleteStoredTodo(
  list: TodoList,
  id: string,
  now: Date,
): Promise<RemovedTodo> {
  const visible = await listVisibleTodos(list);
  const stored = getVisibleTodo(visible, id);
  await recordPwaChanges(describeTodoRemoval(list, stored.text), [{ op: 'todo.remove', id }], now);
  return {
    todo: projectStoredTodo(stored),
    line: formatStoredTodoLine(stored),
    position: visible.indexOf(stored),
  };
}

function planRestoredTodo(list: TodoList, restored: Todo, stored: StoredTodo | null) {
  if (stored === null) {
    return {
      op: 'todo.add' as const,
      list: list.memoryList,
      text: restored.text,
      done: restored.done,
      ...(restored.dueDate === undefined ? {} : { dueDate: restored.dueDate }),
      ...(restored.commitment === undefined ? {} : { commitmentSlug: restored.commitment }),
      ...(restored.source === undefined ? {} : { sourceRef: restored.source }),
      ...(restored.addedOn === undefined ? {} : { addedOn: restored.addedOn }),
      ...(restored.doneOn === undefined ? {} : { doneOn: restored.doneOn }),
    };
  }
  return {
    op: 'todo.add' as const,
    id: stored.id,
    list: list.memoryList,
    position: stored.position,
    text: stored.text,
    done: stored.done,
    extra: readStoredExtra(stored.extra),
    ...(stored.dueDate === null ? {} : { dueDate: stored.dueDate }),
    ...(stored.commitmentSlug === null ? {} : { commitmentSlug: stored.commitmentSlug }),
    ...(stored.sourceRef === null ? {} : { sourceRef: stored.sourceRef }),
    ...(stored.addedOn === null ? {} : { addedOn: stored.addedOn }),
    ...(stored.doneOn === null ? {} : { doneOn: stored.doneOn }),
  };
}

export async function reinstateStoredTodo(
  list: TodoList,
  restoration: TodoRestoration,
  now: Date,
): Promise<Todo> {
  const [restored] = parseTodos(restoration.line);
  if (restored === undefined) throw new TalosError('invalid-input');
  const match = matchRestoredTodo(await listMemoryTodos(list.memoryList), restored);
  if (match.kind === 'duplicate') throw new TalosError('todo-duplicate');
  const response = await recordPwaChanges(
    describeTodoRestoration(list, restored.text),
    [planRestoredTodo(list, restored, match.kind === 'removed' ? match.todo : null)],
    now,
  );
  return await readSavedTodo(readCreatedId(response));
}
