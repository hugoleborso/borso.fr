import {
  appendTodo,
  type NewTodo,
  parseTodos,
  removeTodo,
  restoreTodo,
  type Todo,
  type TodoChanges,
  type TodoEdit,
  type TodoRemoval,
  updateTodo,
} from '@domain/todo.core';
import type { TodoList } from '@domain/todo-list.core';
import { editContentFile, readContentFile } from '../content/content.service';
import { formatParisDate } from '../helpers/calendar/paris-clock.utils';
import { TalosError } from '../helpers/errors/talos-error.types';
import { isMemoryInDatabase } from '../memory/memory-cutover.service';
import {
  addStoredTodo,
  changeStoredTodo,
  deleteStoredTodo,
  listStoredTodos,
  reinstateStoredTodo,
} from './todos-memory.service';
import {
  buildTodoFileEdit,
  buildTodoRemovalFileEdit,
  describeTodoAddition,
  describeTodoChange,
  describeTodoRestoration,
  type RemovedTodo,
  type TodoRestoration,
} from './todos.core';

export type { TodoList } from '@domain/todo-list.core';
export type { RemovedTodo, TodoRestoration } from './todos.core';

function readSavedTodo(edit: TodoEdit): Todo {
  if (edit.kind === 'not-found') throw new TalosError('todo-not-found');
  if (edit.kind === 'duplicate') throw new TalosError('todo-duplicate');
  return edit.todo;
}

function readRemovedTodo(removal: TodoRemoval): RemovedTodo {
  if (removal.kind === 'not-found') throw new TalosError('todo-not-found');
  return { todo: removal.todo, line: removal.line, position: removal.position };
}

// @FollowsBlueprint service-orchestration
export async function listTodos(list: TodoList): Promise<Todo[]> {
  if (await isMemoryInDatabase()) return await listStoredTodos(list);
  return parseTodos((await readContentFile(list.path)) ?? '');
}

export async function addTodo(list: TodoList, newTodo: NewTodo, now: Date): Promise<Todo> {
  if (await isMemoryInDatabase()) return await addStoredTodo(list, newTodo, now);
  const today = formatParisDate(now);
  const edit = await editContentFile(list.path, (current) =>
    buildTodoFileEdit(appendTodo(current ?? '', newTodo, today, list.heading), (text) =>
      describeTodoAddition(list, text),
    ),
  );
  return readSavedTodo(edit);
}

export async function changeTodo(
  list: TodoList,
  id: string,
  changes: TodoChanges,
  now: Date,
): Promise<Todo> {
  if (await isMemoryInDatabase()) return await changeStoredTodo(list, id, changes, now);
  const today = formatParisDate(now);
  const edit = await editContentFile(list.path, (current) =>
    buildTodoFileEdit(updateTodo(current ?? '', id, changes, today), (text) =>
      describeTodoChange(list, changes, text),
    ),
  );
  return readSavedTodo(edit);
}

export async function deleteTodo(list: TodoList, id: string, now: Date): Promise<RemovedTodo> {
  if (await isMemoryInDatabase()) return await deleteStoredTodo(list, id, now);
  const removal = await editContentFile(list.path, (current) =>
    buildTodoRemovalFileEdit(list, removeTodo(current ?? '', id)),
  );
  return readRemovedTodo(removal);
}

export async function reinstateTodo(
  list: TodoList,
  restoration: TodoRestoration,
  now: Date,
): Promise<Todo> {
  if (await isMemoryInDatabase()) return await reinstateStoredTodo(list, restoration, now);
  const edit = await editContentFile(list.path, (current) =>
    buildTodoFileEdit(
      restoreTodo(current ?? '', restoration.line, restoration.position, list.heading),
      (text) => describeTodoRestoration(list, text),
    ),
  );
  return readSavedTodo(edit);
}
