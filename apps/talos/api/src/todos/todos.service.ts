import {
  appendTodo,
  type NewTodo,
  parseTodos,
  type Todo,
  type TodoChanges,
  type TodoEdit,
  updateTodo,
} from '@domain/todo.core';
import { editContentFile, readContentFile } from '../content/content.service';
import { formatParisDate } from '../helpers/calendar/paris-clock.utils';
import { TalosError } from '../helpers/errors/talos-error.types';
import { buildTodoFileEdit, describeTodoAddition, describeTodoChange } from './todos.core';

const TODO_PATH = 'todo.md';

function readSavedTodo(edit: TodoEdit): Todo {
  if (edit.kind === 'not-found') throw new TalosError('todo-not-found');
  if (edit.kind === 'duplicate') throw new TalosError('todo-duplicate');
  return edit.todo;
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
