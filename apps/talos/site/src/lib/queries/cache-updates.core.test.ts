import { describe, expect, it } from 'vitest';
import {
  applyTodoPatch,
  buildPendingTodo,
  findIndexById,
  insertAt,
  isKeptAfterSignOut,
  removeById,
  replaceProposal,
  replaceTodo,
  setProposalStatus,
} from './cache-updates.core';

const TODAY = '2026-10-05';
const OPEN = { id: 'a', text: 'Envoyer le CV', done: false, dueDate: '2026-10-05' };
const DONE = { id: 'b', text: 'Payer', done: true, doneOn: '2026-10-04' };

describe('applyTodoPatch', () => {
  it('checks a todo and dates it today', () => {
    expect(applyTodoPatch([OPEN, DONE], 'a', { done: true }, TODAY)).toEqual([
      { ...OPEN, done: true, doneOn: TODAY },
      DONE,
    ]);
  });

  it('unchecks a todo and forgets when it was done', () => {
    expect(applyTodoPatch([DONE], 'b', { done: false }, TODAY)).toEqual([
      { ...DONE, done: false, doneOn: undefined },
    ]);
  });

  it('keeps the done date when the patch does not touch completion', () => {
    expect(applyTodoPatch([DONE], 'b', { text: 'Payer le loyer' }, TODAY)[0]).toEqual({
      ...DONE,
      text: 'Payer le loyer',
      doneOn: '2026-10-04',
    });
  });

  it('moves or clears the due date', () => {
    expect(applyTodoPatch([OPEN], 'a', { dueDate: '2026-10-09' }, TODAY)[0]?.dueDate).toBe(
      '2026-10-09',
    );
    expect(applyTodoPatch([OPEN], 'a', { dueDate: null }, TODAY)[0]).toStrictEqual({
      id: 'a',
      text: 'Envoyer le CV',
      done: false,
      dueDate: undefined,
      doneOn: undefined,
    });
    expect(applyTodoPatch([OPEN], 'a', { text: 'Envoyer' }, TODAY)[0]?.dueDate).toBe('2026-10-05');
  });

  it('leaves the other todos alone', () => {
    expect(applyTodoPatch([OPEN, DONE], 'z', { done: true }, TODAY)).toEqual([OPEN, DONE]);
  });
});

describe('replaceTodo', () => {
  it('swaps the temporary row for the saved one', () => {
    const saved = { ...OPEN, id: 'server-id' };
    expect(replaceTodo([OPEN, DONE], 'a', saved)).toEqual([saved, DONE]);
  });
});

describe('buildPendingTodo', () => {
  it('builds an open todo added today with a trimmed text', () => {
    expect(buildPendingTodo('tmp', ' Appeler ', '2026-10-06', TODAY)).toEqual({
      id: 'tmp',
      text: 'Appeler',
      done: false,
      dueDate: '2026-10-06',
      addedOn: TODAY,
    });
  });
});

describe('the proposal cache', () => {
  const pending = { slug: 'x', status: 'proposee', title: 'X' };
  const other = { slug: 'y', status: 'proposee', title: 'Y' };

  it('moves the decided proposal to its new status only', () => {
    expect(setProposalStatus([pending, other], 'x', 'acceptee')).toEqual([
      { ...pending, status: 'acceptee' },
      other,
    ]);
  });

  it('replaces a proposal by its slug', () => {
    const saved = { ...pending, status: 'refusee', title: 'X saved' };
    expect(replaceProposal([pending, other], saved)).toEqual([saved, other]);
  });
});

describe('removeById', () => {
  it('drops the item with that identifier and keeps the order of the rest', () => {
    const passkeys = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(removeById(passkeys, 'b')).toEqual([{ id: 'a' }, { id: 'c' }]);
    expect(removeById(passkeys, 'z')).toEqual(passkeys);
  });
});

describe('insertAt', () => {
  it('puts the item back at its rank, or last when the rank is beyond the list', () => {
    expect(insertAt(['a', 'c'], 1, 'b')).toEqual(['a', 'b', 'c']);
    expect(insertAt(['a', 'b'], 0, 'z')).toEqual(['z', 'a', 'b']);
    expect(insertAt(['a'], 5, 'b')).toEqual(['a', 'b']);
  });
});

describe('findIndexById', () => {
  it('answers the rank of an item, or null when it is absent', () => {
    expect(findIndexById([{ id: 'a' }, { id: 'b' }], 'b')).toBe(1);
    expect(findIndexById([{ id: 'a' }], 'a')).toBe(0);
    expect(findIndexById([{ id: 'a' }], 'z')).toBeNull();
  });
});

describe('isKeptAfterSignOut', () => {
  it('keeps only the session query, so the sign-in screen knows a passkey exists', () => {
    expect(isKeptAfterSignOut(['session', 'current'], 'session')).toBe(true);
    expect(isKeptAfterSignOut(['today', 'overview'], 'session')).toBe(false);
    expect(isKeptAfterSignOut([], 'session')).toBe(false);
  });
});
