import { describe, expect, it } from 'vitest';
import {
  selectDecisionToast,
  selectPushTestToast,
  selectTodoReversal,
  selectTodoUpdateToast,
} from './mutation-toasts.core';

describe('selectDecisionToast', () => {
  it('celebrates an accepted proposal, since Talos acts on it', () => {
    expect(selectDecisionToast('acceptee')).toEqual({
      tone: 'success',
      messageKey: 'toast.proposal-accepted',
    });
  });

  it('simply confirms a refused proposal', () => {
    expect(selectDecisionToast('refusee')).toEqual({
      tone: 'neutral',
      messageKey: 'toast.proposal-refused',
    });
  });
});

describe('selectTodoUpdateToast', () => {
  it('confirms a checked todo', () => {
    expect(selectTodoUpdateToast({ done: true })).toEqual({
      tone: 'neutral',
      messageKey: 'toast.todo-done',
    });
  });

  it('confirms a todo put back to do', () => {
    expect(selectTodoUpdateToast({ done: false })).toEqual({
      tone: 'neutral',
      messageKey: 'toast.todo-reopened',
    });
  });

  it('confirms an edited todo', () => {
    expect(selectTodoUpdateToast({ text: 'Nouveau texte' })).toEqual({
      tone: 'neutral',
      messageKey: 'toast.todo-saved',
    });
  });
});

describe('selectPushTestToast', () => {
  it('confirms the test notification left for at least one device', () => {
    expect(selectPushTestToast(1)).toEqual({ tone: 'success', messageKey: 'toast.push-test-sent' });
  });

  it('says no device is subscribed when nothing was delivered', () => {
    expect(selectPushTestToast(0)).toEqual({ tone: 'info', messageKey: 'toast.push-test-none' });
  });
});

describe('selectTodoReversal', () => {
  it('undoes a check or a reopening, and offers nothing for an edit', () => {
    expect(selectTodoReversal({ id: 'a', done: true })).toEqual({ id: 'a', done: false });
    expect(selectTodoReversal({ id: 'a', done: false })).toEqual({ id: 'a', done: true });
    expect(selectTodoReversal({ id: 'a', text: 'x' })).toBeNull();
  });
});
