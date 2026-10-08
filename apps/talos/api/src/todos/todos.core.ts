import type { TodoChanges, TodoEdit, TodoRemoval } from '@domain/todo.core';
import type { FileEdit } from '../content/content.service';

// @FollowsBlueprint core-decision
export function describeTodoChange(changes: TodoChanges, text: string): string {
  if (changes.done === true) return `pwa : todo cochée « ${text} »`;
  if (changes.done === false) return `pwa : todo décochée « ${text} »`;
  return `pwa : todo modifiée « ${text} »`;
}

export function describeTodoAddition(text: string): string {
  return `pwa : todo ajoutée « ${text} »`;
}

export function describeTodoRemoval(text: string): string {
  return `pwa : todo supprimée « ${text} »`;
}

export function describeTodoRestoration(text: string): string {
  return `pwa : todo restaurée « ${text} »`;
}

export function buildTodoRemovalFileEdit(removal: TodoRemoval): FileEdit<TodoRemoval> {
  if (removal.kind !== 'removed') return { content: null, outcome: removal };
  return {
    content: removal.markdown,
    commitMessage: describeTodoRemoval(removal.todo.text),
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
