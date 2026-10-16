import { describe, expect, it } from 'vitest';
import {
  type ChangeOperation,
  type ChangeRequest,
  changeOperationSchema,
  changeRequestSchema,
  MAXIMUM_OPERATIONS_PER_CALL,
} from './memory-changes.schema';

describe('changeRequestSchema', () => {
  const request: ChangeRequest = {
    idempotencyKey: 'nuit-2026-10-17-1',
    actor: 'routine:nuit',
    operations: [{ op: 'state.set', key: 'cursors', value: {} }],
  };

  it('accepts a call with a key, an actor and at least one operation', () => {
    expect(changeRequestSchema.safeParse(request).success).toBe(true);
  });

  it('refuses a call without an idempotency key or with a key over 200 characters', () => {
    expect(changeRequestSchema.safeParse({ ...request, idempotencyKey: '' }).success).toBe(false);
    expect(
      changeRequestSchema.safeParse({ ...request, idempotencyKey: 'k'.repeat(201) }).success,
    ).toBe(false);
  });

  it('refuses more than 500 operations in one call', () => {
    const operations = Array.from({ length: MAXIMUM_OPERATIONS_PER_CALL + 1 }, () => ({}));
    expect(changeRequestSchema.safeParse({ ...request, operations }).success).toBe(false);
  });
});

describe('changeOperationSchema', () => {
  it('accepts an entity upsert with a known kind and a closeness from 1 to 5', () => {
    const upsert = {
      op: 'entity.upsert',
      slug: 'second-brain/personnes/alice-martin',
      kind: 'personne',
      title: 'Alice Martin',
      closeness: 3,
      attributes: { type: 'personne', alias: ['Alice', 'AM'] },
    };
    expect(changeOperationSchema.safeParse(upsert).success).toBe(true);
    expect(changeOperationSchema.safeParse({ ...upsert, closeness: 6 }).success).toBe(false);
    expect(changeOperationSchema.safeParse({ ...upsert, kind: 'robot' }).success).toBe(false);
  });

  it('refuses an operation it does not know', () => {
    expect(changeOperationSchema.safeParse({ op: 'entity.delete', slug: 'x' }).success).toBe(false);
  });

  it('keeps the focus to three items at most', () => {
    const focusItem = { title: 'Préparer l’atelier Acme' };
    expect(
      changeOperationSchema.safeParse({
        op: 'focus.replace',
        items: [focusItem, focusItem, focusItem],
      }).success,
    ).toBe(true);
    expect(
      changeOperationSchema.safeParse({
        op: 'focus.replace',
        items: [focusItem, focusItem, focusItem, focusItem],
      }).success,
    ).toBe(false);
  });

  it('closes a fact only by its uuid', () => {
    expect(
      changeOperationSchema.safeParse({ op: 'fact.close', id: 'abc', until: '2026-10' }).success,
    ).toBe(false);
  });

  it('lets a todo update clear the due date with null', () => {
    const cleared: ChangeOperation = { op: 'todo.update', id: 'a1b2c3d4e5', dueDate: null };
    expect(changeOperationSchema.parse(cleared)).toEqual(cleared);
  });
});
