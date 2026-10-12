import { describe, expect, it } from 'vitest';
import { buildTodoCreation, buildTodoEdit, canCreateTodo } from './todo-form.core';

describe('canCreateTodo', () => {
  it('needs a text that is not blank', () => {
    expect(canCreateTodo(' Appeler ')).toBe(true);
    expect(canCreateTodo('  ')).toBe(false);
  });

  it('refuses what the API would refuse: a pipe or a text past 500 characters', () => {
    expect(canCreateTodo('Appeler | Lucie')).toBe(false);
    expect(canCreateTodo('a'.repeat(501))).toBe(false);
    expect(canCreateTodo('a'.repeat(500))).toBe(true);
  });
});

describe('buildTodoCreation', () => {
  it('sends the trimmed text and the due date', () => {
    expect(buildTodoCreation({ text: ' Appeler ', dueDate: '2026-10-06' })).toEqual({
      text: 'Appeler',
      dueDate: '2026-10-06',
    });
  });

  it('omits an empty due date', () => {
    expect(buildTodoCreation({ text: ' Appeler ', dueDate: '' })).toStrictEqual({
      text: 'Appeler',
    });
  });
});

describe('buildTodoEdit', () => {
  const original = { text: 'Envoyer', dueDate: '2026-10-05' };

  it('sends only what changed', () => {
    expect(buildTodoEdit(original, { text: 'Envoyer le CV', dueDate: '2026-10-05' })).toStrictEqual(
      {
        text: 'Envoyer le CV',
      },
    );
    expect(buildTodoEdit(original, { text: 'Envoyer', dueDate: '2026-10-07' })).toStrictEqual({
      dueDate: '2026-10-07',
    });
  });

  it('ignores a blank text and sends nothing when nothing changed', () => {
    expect(buildTodoEdit(original, { text: '  ', dueDate: '2026-10-05' })).toStrictEqual({});
  });

  it('clears the due date with an empty one', () => {
    expect(buildTodoEdit(original, { text: 'Envoyer', dueDate: '' })).toStrictEqual({
      dueDate: null,
    });
  });

  it('treats a missing due date as empty', () => {
    expect(buildTodoEdit({ text: 'Envoyer' }, { text: 'Envoyer', dueDate: '' })).toStrictEqual({});
    expect(
      buildTodoEdit({ text: 'Envoyer' }, { text: 'Envoyer', dueDate: '2026-10-09' }),
    ).toStrictEqual({
      dueDate: '2026-10-09',
    });
  });
});
