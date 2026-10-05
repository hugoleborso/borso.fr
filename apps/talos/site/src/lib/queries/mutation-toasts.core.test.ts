import { describe, expect, it } from 'vitest';
import {
  selectDecisionToast,
  selectPushTestToast,
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
