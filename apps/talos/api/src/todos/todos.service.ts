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
import {
  buildTodoFileEdit,
  buildTodoRemovalFileEdit,
  describeTodoAddition,
  describeTodoChange,
  describeTodoRestoration,
} from './todos.core';

export type { TodoList } from '@domain/todo-list.core';

function readSavedTodo(edit: TodoEdit): Todo {
  if (edit.kind === 'not-found') throw new TalosError('todo-not-found');
  if (edit.kind === 'duplicate') throw new TalosError('todo-duplicate');
  return edit.todo;
}

export interface RemovedTodo {
  readonly todo: Todo;
  readonly line: string;
  readonly position: number;
}

export interface TodoRestoration {
  readonly line: string;
  readonly position: number;
}

function readRemovedTodo(removal: TodoRemoval): RemovedTodo {
  if (removal.kind === 'not-found') throw new TalosError('todo-not-found');
  return { todo: removal.todo, line: removal.line, position: removal.position };
}

// @FollowsBlueprint service-orchestration
export async function listTodos(list: TodoList): Promise<Todo[]> {
  return parseTodos((await readContentFile(list.path)) ?? '');
}

export async function addTodo(list: TodoList, newTodo: NewTodo, now: Date): Promise<Todo> {
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
  const today = formatParisDate(now);
  const edit = await editContentFile(list.path, (current) =>
    buildTodoFileEdit(updateTodo(current ?? '', id, changes, today), (text) =>
      describeTodoChange(list, changes, text),
    ),
  );
  return readSavedTodo(edit);
}

export async function deleteTodo(list: TodoList, id: string): Promise<RemovedTodo> {
  const removal = await editContentFile(list.path, (current) =>
    buildTodoRemovalFileEdit(list, removeTodo(current ?? '', id)),
  );
  return readRemovedTodo(removal);
}

export async function reinstateTodo(list: TodoList, restoration: TodoRestoration): Promise<Todo> {
  const edit = await editContentFile(list.path, (current) =>
    buildTodoFileEdit(
      restoreTodo(current ?? '', restoration.line, restoration.position, list.heading),
      (text) => describeTodoRestoration(list, text),
    ),
  );
  return readSavedTodo(edit);
}
