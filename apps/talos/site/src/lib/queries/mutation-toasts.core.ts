import type { ProposalDecision } from '@domain/proposal.core';
import type { TranslatableToast } from '../toast.core';
import type { TodoPatch } from './cache-updates.core';

export const TODO_ADDED_TOAST: TranslatableToast = {
  tone: 'neutral',
  messageKey: 'toast.todo-added',
};
export const FOCUS_SAVED_TOAST: TranslatableToast = {
  tone: 'neutral',
  messageKey: 'toast.focus-saved',
};
export const MESSAGE_SENT_TOAST: TranslatableToast = {
  tone: 'success',
  messageKey: 'toast.message-sent',
};
export const PASSKEY_ADDED_TOAST: TranslatableToast = {
  tone: 'success',
  messageKey: 'toast.passkey-added',
};
export const PASSKEY_REMOVED_TOAST: TranslatableToast = {
  tone: 'neutral',
  messageKey: 'toast.passkey-removed',
};
export const PUSH_ENABLED_TOAST: TranslatableToast = {
  tone: 'success',
  messageKey: 'toast.push-enabled',
};
export const PUSH_DISABLED_TOAST: TranslatableToast = {
  tone: 'neutral',
  messageKey: 'toast.push-disabled',
};

const DECISION_TOAST: Readonly<Record<ProposalDecision, TranslatableToast>> = {
  acceptee: { tone: 'success', messageKey: 'toast.proposal-accepted' },
  refusee: { tone: 'neutral', messageKey: 'toast.proposal-refused' },
};

// @FollowsBlueprint core-view-intent
export function selectDecisionToast(decision: ProposalDecision): TranslatableToast {
  return DECISION_TOAST[decision];
}

export function selectTodoUpdateToast(patch: TodoPatch): TranslatableToast {
  if (patch.done === true) return { tone: 'neutral', messageKey: 'toast.todo-done' };
  if (patch.done === false) return { tone: 'neutral', messageKey: 'toast.todo-reopened' };
  return { tone: 'neutral', messageKey: 'toast.todo-saved' };
}

export function selectPushTestToast(delivered: number): TranslatableToast {
  return delivered > 0
    ? { tone: 'success', messageKey: 'toast.push-test-sent' }
    : { tone: 'info', messageKey: 'toast.push-test-none' };
}
