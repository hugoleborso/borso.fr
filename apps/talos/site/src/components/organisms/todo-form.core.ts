import { todoTextSchema } from '@domain/todo.core';

export interface TodoDraft {
  readonly text: string;
  readonly dueDate: string;
}

// @FollowsBlueprint core-form-schema
export function canCreateTodo(text: string): boolean {
  return todoTextSchema.safeParse(text).success;
}

export function buildTodoCreation(draft: TodoDraft): { text: string; dueDate?: string } {
  const text = draft.text.trim();
  return draft.dueDate.length > 0 ? { text, dueDate: draft.dueDate } : { text };
}

export function buildTodoEdit(
  original: { readonly text: string; readonly dueDate?: string },
  draft: TodoDraft,
): { text?: string; dueDate?: string | null } {
  const text = draft.text.trim();
  const { dueDate } = draft;
  return {
    ...(text.length > 0 && text !== original.text ? { text } : {}),
    ...(dueDate === (original.dueDate ?? '') ? {} : { dueDate: dueDate || null }),
  };
}
