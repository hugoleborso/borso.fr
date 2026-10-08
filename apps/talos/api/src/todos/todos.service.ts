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

const TODO_PATH = 'todo.md';

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
export async function listTodos(): Promise<Todo[]> {
  return parseTodos((await readContentFile(TODO_PATH)) ?? '');
}

export async function addTodo(newTodo: NewTodo, now: Date): Promise<Todo> {
  const today = formatParisDate(now);
  const edit = await editContentFile(TODO_PATH, (current) =>
    buildTodoFileEdit(appendTodo(current ?? '', newTodo, today), describeTodoAddition),
  );
  return readSavedTodo(edit);
}

export async function changeTodo(id: string, changes: TodoChanges, now: Date): Promise<Todo> {
  const today = formatParisDate(now);
  const edit = await editContentFile(TODO_PATH, (current) =>
    buildTodoFileEdit(updateTodo(current ?? '', id, changes, today), (text) =>
      describeTodoChange(changes, text),
    ),
  );
  return readSavedTodo(edit);
}

export async function deleteTodo(id: string): Promise<RemovedTodo> {
  const removal = await editContentFile(TODO_PATH, (current) =>
    buildTodoRemovalFileEdit(removeTodo(current ?? '', id)),
  );
  return readRemovedTodo(removal);
}

export async function reinstateTodo(restoration: TodoRestoration): Promise<Todo> {
  const edit = await editContentFile(TODO_PATH, (current) =>
    buildTodoFileEdit(
      restoreTodo(current ?? '', restoration.line, restoration.position),
      describeTodoRestoration,
    ),
  );
  return readSavedTodo(edit);
}
