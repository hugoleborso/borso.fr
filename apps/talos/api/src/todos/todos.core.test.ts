import { TODO_LISTS } from '@domain/todo-list.core';
import { describe, expect, it } from 'vitest';
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
  type StoredTodo,
} from './todos.core';

const MAIN = TODO_LISTS.main;

describe('describeTodoChange', () => {
  it('names the change in a French commit message', () => {
    expect(describeTodoChange(MAIN, { done: true }, 'Payer')).toBe('pwa : todo cochée « Payer »');
    expect(describeTodoChange(MAIN, { done: false }, 'Payer')).toBe(
      'pwa : todo décochée « Payer »',
    );
    expect(describeTodoChange(MAIN, { dueDate: null }, 'Payer')).toBe(
      'pwa : todo modifiée « Payer »',
    );
  });
});

describe('the work list', () => {
  it('names the list in every commit message', () => {
    const work = TODO_LISTS.work;
    expect(describeTodoChange(work, { done: true }, 'Payer')).toBe(
      'pwa : todo taff cochée « Payer »',
    );
    expect(describeTodoAddition(work, 'Payer')).toBe('pwa : todo taff ajoutée « Payer »');
    expect(describeTodoRemoval(work, 'Payer')).toBe('pwa : todo taff supprimée « Payer »');
    expect(describeTodoRestoration(work, 'Payer')).toBe('pwa : todo taff restaurée « Payer »');
  });
});

describe('describeTodoAddition', () => {
  it('names the added task', () => {
    expect(describeTodoAddition(MAIN, 'Payer')).toBe('pwa : todo ajoutée « Payer »');
  });
});

describe('describeTodoRemoval and describeTodoRestoration', () => {
  it('name the removed and the restored task', () => {
    expect(describeTodoRemoval(MAIN, 'Payer')).toBe('pwa : todo supprimée « Payer »');
    expect(describeTodoRestoration(MAIN, 'Payer')).toBe('pwa : todo restaurée « Payer »');
  });
});

const STORED_TODO: StoredTodo = {
  id: '0f3c2a1b-4d5e-4f60-8a7b-9c0d1e2f3a4b',
  text: 'Envoyer le devis à Acme',
  done: false,
  dueDate: '2026-10-05',
  commitmentSlug: 'engagements/2026-10-05-devis-acme',
  sourceRef: 'sources/2026/10/04/appel-acme.md',
  addedOn: '2026-10-04',
  doneOn: null,
  extra: '[["priorite","haute"]]',
  removed: false,
  position: 3,
};

describe('stored todos', () => {
  it('projects a stored todo onto the shape of the API', () => {
    expect(projectStoredTodo(STORED_TODO)).toStrictEqual({
      id: STORED_TODO.id,
      text: 'Envoyer le devis à Acme',
      done: false,
      dueDate: '2026-10-05',
      commitment: 'engagements/2026-10-05-devis-acme',
      source: 'sources/2026/10/04/appel-acme.md',
      addedOn: '2026-10-04',
    });
  });

  it('leaves out an empty attribute and a due date that is not a day', () => {
    expect(
      projectStoredTodo({
        ...STORED_TODO,
        done: true,
        dueDate: '2026-10',
        commitmentSlug: '',
        sourceRef: null,
        addedOn: null,
        doneOn: '2026-10-06',
      }),
    ).toStrictEqual({
      id: STORED_TODO.id,
      text: 'Envoyer le devis à Acme',
      done: true,
      doneOn: '2026-10-06',
    });
  });

  it('writes the line of todo.md back, unknown attributes last', () => {
    expect(formatStoredTodoLine(STORED_TODO)).toBe(
      '- [ ] Envoyer le devis à Acme | échéance: 2026-10-05 | engagement: engagements/2026-10-05-devis-acme | src: sources/2026/10/04/appel-acme.md | ajouté: 2026-10-04 | priorite: haute',
    );
    expect(
      formatStoredTodoLine({
        ...STORED_TODO,
        done: true,
        dueDate: null,
        commitmentSlug: null,
        sourceRef: null,
        doneOn: '2026-10-05',
        extra: '[]',
      }),
    ).toBe('- [x] Envoyer le devis à Acme | ajouté: 2026-10-04 | fait: 2026-10-05');
  });

  it('reads no unknown attribute out of a malformed extra column', () => {
    expect(readStoredExtra('{"priorite":"haute"}')).toEqual([]);
  });

  it('finds a task already on the list, apart from the one being edited', () => {
    expect(isTaskTaken([STORED_TODO], 'Envoyer le devis à Acme', '2026-10-04')).toBe(true);
    expect(
      isTaskTaken([STORED_TODO], 'Envoyer le devis à Acme', '2026-10-04', STORED_TODO.id),
    ).toBe(false);
    expect(
      isTaskTaken([{ ...STORED_TODO, removed: true }], 'Envoyer le devis à Acme', '2026-10-04'),
    ).toBe(false);
    expect(
      isTaskTaken([{ ...STORED_TODO, addedOn: null }], 'Envoyer le devis à Acme', undefined),
    ).toBe(true);
  });

  it('tells tasks apart by their text and their day of addition', () => {
    expect(isTaskTaken([STORED_TODO], 'Rappeler Alice Martin', '2026-10-04')).toBe(false);
    expect(isTaskTaken([STORED_TODO], 'Envoyer le devis à Acme', '2026-10-05')).toBe(false);
  });

  it('restores nothing from a removed todo of another task', () => {
    const otherRemoved = { ...STORED_TODO, text: 'Autre tâche', removed: true };
    expect(matchRestoredTodo([otherRemoved], projectStoredTodo(STORED_TODO))).toEqual({
      kind: 'none',
    });
  });

  it('matches a restored line to the removed todo it came from', () => {
    const removed = { ...STORED_TODO, removed: true };
    const restored = projectStoredTodo(STORED_TODO);
    expect(matchRestoredTodo([removed], restored)).toEqual({ kind: 'removed', todo: removed });
    expect(matchRestoredTodo([STORED_TODO], restored)).toEqual({ kind: 'duplicate' });
    expect(matchRestoredTodo([], restored)).toEqual({ kind: 'none' });
  });
});
