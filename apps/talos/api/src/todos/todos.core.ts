import type { TodoList } from '@domain/todo-list.core';
import type { TodoChanges, TodoEdit, TodoRemoval } from '@domain/todo.core';
import type { FileEdit } from '../content/content.service';

// @FollowsBlueprint core-decision
export function describeTodoChange(list: TodoList, changes: TodoChanges, text: string): string {
  if (changes.done === true) return `pwa : ${list.commitNoun} cochée « ${text} »`;
  if (changes.done === false) return `pwa : ${list.commitNoun} décochée « ${text} »`;
  return `pwa : ${list.commitNoun} modifiée « ${text} »`;
}

export function describeTodoAddition(list: TodoList, text: string): string {
  return `pwa : ${list.commitNoun} ajoutée « ${text} »`;
}

export function describeTodoRemoval(list: TodoList, text: string): string {
  return `pwa : ${list.commitNoun} supprimée « ${text} »`;
}

export function describeTodoRestoration(list: TodoList, text: string): string {
  return `pwa : ${list.commitNoun} restaurée « ${text} »`;
}

export function buildTodoRemovalFileEdit(
  list: TodoList,
  removal: TodoRemoval,
): FileEdit<TodoRemoval> {
  if (removal.kind !== 'removed') return { content: null, outcome: removal };
  return {
    content: removal.markdown,
    commitMessage: describeTodoRemoval(list, removal.todo.text),
    outcome: removal,
  };
}

export function buildTodoFileEdit(
  edit: TodoEdit,
  describe: (text: string) => string,
): FileEdit<TodoEdit> {
  if (edit.kind !== 'saved') return { content: null, outcome: edit };
  return { content: edit.markdown, commitMessage: describe(edit.todo.text), outcome: edit };
}
