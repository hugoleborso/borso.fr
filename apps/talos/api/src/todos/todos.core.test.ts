import { TODO_LISTS } from '@domain/todo-list.core';
import { describe, expect, it } from 'vitest';
import {
  buildTodoFileEdit,
  buildTodoRemovalFileEdit,
  describeTodoAddition,
  describeTodoChange,
  describeTodoRemoval,
  describeTodoRestoration,
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

describe('buildTodoFileEdit', () => {
  it('writes a saved edit with its commit message', () => {
    const saved = {
      kind: 'saved',
      markdown: '- [ ] Payer\n',
      todo: { id: 'a', text: 'Payer', done: false },
    } as const;
    expect(buildTodoFileEdit(saved, (text) => describeTodoAddition(MAIN, text))).toEqual({
      content: '- [ ] Payer\n',
      commitMessage: 'pwa : todo ajoutée « Payer »',
      outcome: saved,
    });
  });

  it('writes nothing for a refused edit', () => {
    expect(
      buildTodoFileEdit({ kind: 'not-found' }, (text) => describeTodoAddition(MAIN, text)),
    ).toEqual({
      content: null,
      outcome: { kind: 'not-found' },
    });
  });
});

describe('describeTodoRemoval and describeTodoRestoration', () => {
  it('name the removed and the restored task', () => {
    expect(describeTodoRemoval(MAIN, 'Payer')).toBe('pwa : todo supprimée « Payer »');
    expect(describeTodoRestoration(MAIN, 'Payer')).toBe('pwa : todo restaurée « Payer »');
  });
});

describe('buildTodoRemovalFileEdit', () => {
  it('writes a removal with its commit message', () => {
    const removed = {
      kind: 'removed',
      markdown: '# Todo\n',
      todo: { id: 'a', text: 'Payer', done: false },
      line: '- [ ] Payer',
      position: 0,
    } as const;
    expect(buildTodoRemovalFileEdit(MAIN, removed)).toEqual({
      content: '# Todo\n',
      commitMessage: 'pwa : todo supprimée « Payer »',
      outcome: removed,
    });
  });

  it('writes nothing for an unknown task', () => {
    expect(buildTodoRemovalFileEdit(MAIN, { kind: 'not-found' })).toEqual({
      content: null,
      outcome: { kind: 'not-found' },
    });
  });
});
