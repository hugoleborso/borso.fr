import type { TodoList } from '@domain/todo-list.core';
import { isoDateSchema, type Todo, type TodoChanges } from '@domain/todo.core';
import { z } from 'zod';

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

export interface RemovedTodo {
  readonly todo: Todo;
  readonly line: string;
  readonly position: number;
}

export interface TodoRestoration {
  readonly line: string;
  readonly position: number;
}

export interface StoredTodo {
  readonly id: string;
  readonly text: string;
  readonly done: boolean;
  readonly dueDate: string | null;
  readonly commitmentSlug: string | null;
  readonly sourceRef: string | null;
  readonly addedOn: string | null;
  readonly doneOn: string | null;
  readonly extra: string;
  readonly removed: boolean;
  readonly position: number;
}

export type StoredTodoMatch =
  | { readonly kind: 'removed'; readonly todo: StoredTodo }
  | { readonly kind: 'duplicate' }
  | { readonly kind: 'none' };

const CHECKED_BOX = '[x]';
const EMPTY_BOX = '[ ]';
const LINE_ATTRIBUTE_SEPARATOR = ' | ';
const storedExtraSchema = z.array(z.tuple([z.string(), z.string()]));

function presentValue(value: string | null): string | undefined {
  return value === null || value === '' ? undefined : value;
}

export function readStoredExtra(extra: string): [string, string][] {
  const stored: unknown = JSON.parse(extra);
  const extraAttributes = storedExtraSchema.safeParse(stored);
  return extraAttributes.success ? extraAttributes.data : [];
}

export function projectStoredTodo(stored: StoredTodo): Todo {
  const dueDate = isoDateSchema.safeParse(stored.dueDate).data;
  const commitment = presentValue(stored.commitmentSlug);
  const source = presentValue(stored.sourceRef);
  const addedOn = presentValue(stored.addedOn);
  const doneOn = presentValue(stored.doneOn);
  return {
    id: stored.id,
    text: stored.text,
    done: stored.done,
    ...(dueDate === undefined ? {} : { dueDate }),
    ...(commitment === undefined ? {} : { commitment }),
    ...(source === undefined ? {} : { source }),
    ...(addedOn === undefined ? {} : { addedOn }),
    ...(doneOn === undefined ? {} : { doneOn }),
  };
}

export function formatStoredTodoLine(stored: StoredTodo): string {
  const attributes: [string, string | null][] = [
    ['échéance', stored.dueDate],
    ['engagement', stored.commitmentSlug],
    ['src', stored.sourceRef],
    ['ajouté', stored.addedOn],
    ['fait', stored.doneOn],
    ...readStoredExtra(stored.extra),
  ];
  const suffix = attributes
    .filter((attribute): attribute is [string, string] => attribute[1] !== null)
    .map(([key, value]) => `${LINE_ATTRIBUTE_SEPARATOR}${key}: ${value}`)
    .join('');
  return `- ${stored.done ? CHECKED_BOX : EMPTY_BOX} ${stored.text}${suffix}`;
}

function isSameTask(stored: StoredTodo, text: string, addedOn: string | undefined): boolean {
  return stored.text === text && (presentValue(stored.addedOn) ?? null) === (addedOn ?? null);
}

export function isTaskTaken(
  stored: readonly StoredTodo[],
  text: string,
  addedOn: string | undefined,
  exceptId: string | null = null,
): boolean {
  return stored.some(
    (candidate) =>
      !candidate.removed && candidate.id !== exceptId && isSameTask(candidate, text, addedOn),
  );
}

export function matchRestoredTodo(stored: readonly StoredTodo[], restored: Todo): StoredTodoMatch {
  if (isTaskTaken(stored, restored.text, restored.addedOn)) return { kind: 'duplicate' };
  const removed = stored.findLast(
    (candidate) => candidate.removed && isSameTask(candidate, restored.text, restored.addedOn),
  );
  return removed === undefined ? { kind: 'none' } : { kind: 'removed', todo: removed };
}
