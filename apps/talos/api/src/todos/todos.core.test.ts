import { describe, expect, it } from 'vitest';
import {
  buildTodoFileEdit,
  buildTodoRemovalFileEdit,
  describeTodoAddition,
  describeTodoChange,
  describeTodoRemoval,
  describeTodoRestoration,
} from './todos.core';

describe('describeTodoChange', () => {
  it('names the change in a French commit message', () => {
    expect(describeTodoChange({ done: true }, 'Payer')).toBe('pwa : todo cochée « Payer »');
    expect(describeTodoChange({ done: false }, 'Payer')).toBe('pwa : todo décochée « Payer »');
    expect(describeTodoChange({ dueDate: null }, 'Payer')).toBe('pwa : todo modifiée « Payer »');
  });
});

describe('describeTodoAddition', () => {
  it('names the added task', () => {
    expect(describeTodoAddition('Payer')).toBe('pwa : todo ajoutée « Payer »');
  });
});

describe('buildTodoFileEdit', () => {
  it('writes a saved edit with its commit message', () => {
    const saved = {
      kind: 'saved',
      markdown: '- [ ] Payer\n',
      todo: { id: 'a', text: 'Payer', done: false },
    } as const;
    expect(buildTodoFileEdit(saved, describeTodoAddition)).toEqual({
      content: '- [ ] Payer\n',
      commitMessage: 'pwa : todo ajoutée « Payer »',
      outcome: saved,
    });
  });

  it('writes nothing for a refused edit', () => {
    expect(buildTodoFileEdit({ kind: 'not-found' }, describeTodoAddition)).toEqual({
      content: null,
      outcome: { kind: 'not-found' },
    });
  });
});

describe('describeTodoRemoval and describeTodoRestoration', () => {
  it('name the removed and the restored task', () => {
    expect(describeTodoRemoval('Payer')).toBe('pwa : todo supprimée « Payer »');
    expect(describeTodoRestoration('Payer')).toBe('pwa : todo restaurée « Payer »');
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
    expect(buildTodoRemovalFileEdit(removed)).toEqual({
      content: '# Todo\n',
      commitMessage: 'pwa : todo supprimée « Payer »',
      outcome: removed,
    });
  });

  it('writes nothing for an unknown task', () => {
    expect(buildTodoRemovalFileEdit({ kind: 'not-found' })).toEqual({
      content: null,
      outcome: { kind: 'not-found' },
    });
  });
});
