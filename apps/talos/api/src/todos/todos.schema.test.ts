import { describe, expect, it } from 'vitest';
import { createTodoSchema, todoIdSchema, updateTodoSchema } from './todos.schema';

describe('createTodoSchema', () => {
  it('accepts a text with an optional due date', () => {
    expect(createTodoSchema.parse({ text: ' Payer ', dueDate: '2026-10-05' })).toEqual({
      text: 'Payer',
      dueDate: '2026-10-05',
    });
  });

  it('refuses a due date that is not a calendar date', () => {
    expect(createTodoSchema.safeParse({ text: 'Payer', dueDate: 'lundi' }).success).toBe(false);
  });
});

describe('updateTodoSchema', () => {
  it('accepts a null due date to remove it', () => {
    expect(updateTodoSchema.parse({ dueDate: null, done: true })).toEqual({
      dueDate: null,
      done: true,
    });
  });
});

describe('todoIdSchema', () => {
  it('accepts ten hexadecimal characters only', () => {
    expect(todoIdSchema.safeParse({ id: '4e6590b574' }).success).toBe(true);
    expect(todoIdSchema.safeParse({ id: '4e6590b57' }).success).toBe(false);
    expect(todoIdSchema.safeParse({ id: '4E6590B574' }).success).toBe(false);
  });
});
