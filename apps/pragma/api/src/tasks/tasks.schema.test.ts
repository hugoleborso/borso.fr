import { describe, expect, it } from 'vitest';
import { taskCreateSchema, taskIdParamSchema, taskUpdateSchema } from './tasks.schema';

const MEMBER_ID = '00000000-0000-4000-8000-000000000001';

function task(overrides: Record<string, unknown> = {}): unknown {
  return { title: 'Buy strings', ...overrides };
}

describe('taskCreateSchema', () => {
  it('needs only a title and fills the rest in', () => {
    expect(taskCreateSchema.parse(task())).toEqual({
      title: 'Buy strings',
      notes: '',
      status: 'todo',
      assigneeId: null,
      songId: null,
      dueDate: null,
    });
  });

  it('trims the title and refuses whitespace alone', () => {
    expect(taskCreateSchema.parse(task({ title: '  Buy strings  ' })).title).toBe('Buy strings');
    expect(taskCreateSchema.safeParse(task({ title: '   ' })).success).toBe(false);
  });

  it('accepts the three statuses the board draws and nothing else', () => {
    for (const status of ['todo', 'doing', 'done']) {
      expect(taskCreateSchema.safeParse(task({ status })).success).toBe(true);
    }
    expect(taskCreateSchema.safeParse(task({ status: 'blocked' })).success).toBe(false);
  });

  it('takes an assignee and a composition only as identifiers, or as nothing at all', () => {
    expect(taskCreateSchema.safeParse(task({ assigneeId: MEMBER_ID })).success).toBe(true);
    expect(taskCreateSchema.safeParse(task({ assigneeId: null })).success).toBe(true);
    expect(taskCreateSchema.safeParse(task({ assigneeId: 'alma' })).success).toBe(false);
    expect(taskCreateSchema.safeParse(task({ songId: 'the-one-about-rain' })).success).toBe(false);
  });

  it('takes a due date as a timestamp', () => {
    expect(taskCreateSchema.safeParse(task({ dueDate: '2026-05-01T12:00:00.000Z' })).success).toBe(
      true,
    );
    expect(taskCreateSchema.safeParse(task({ dueDate: '2026-05-01' })).success).toBe(false);
  });
});

describe('taskUpdateSchema', () => {
  it('accepts a patch carrying one field, and one carrying none', () => {
    expect(taskUpdateSchema.parse({ status: 'done' })).toEqual({ status: 'done' });
    expect(taskUpdateSchema.parse({})).toEqual({});
  });
});

describe('taskIdParamSchema', () => {
  it('takes an identifier and refuses anything else', () => {
    expect(taskIdParamSchema.safeParse({ id: MEMBER_ID }).success).toBe(true);
    expect(taskIdParamSchema.safeParse({ id: '12' }).success).toBe(false);
  });
});
