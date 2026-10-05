import type { TodoChanges, TodoEdit } from '@domain/todo.core';
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

export function buildTodoFileEdit(
  edit: TodoEdit,
  describe: (text: string) => string,
): FileEdit<TodoEdit> {
  if (edit.kind !== 'saved') return { content: null, outcome: edit };
  return { content: edit.markdown, commitMessage: describe(edit.todo.text), outcome: edit };
}
