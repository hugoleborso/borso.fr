import { MESSAGE_TEXT_LIMIT } from '@domain/routine-run.core';
import type { ClaudeCodeEnvironment } from '../../lib/claude-code-address.core';

export const LONG_MESSAGE_THRESHOLD = 6000;

const ALWAYS_LINKED_ENVIRONMENT: ClaudeCodeEnvironment = 'build';

// @FollowsBlueprint core-view-intent
export function isMessageTooLong(text: string): boolean {
  return text.length > LONG_MESSAGE_THRESHOLD;
}

export function isEnvironmentLinked(
  environment: ClaudeCodeEnvironment,
  isRoutineConfigured: boolean,
): boolean {
  return environment === ALWAYS_LINKED_ENVIRONMENT || !isRoutineConfigured;
}

export function isMessageTooLongToSend(text: string, isRoutineConfigured: boolean): boolean {
  return isRoutineConfigured && text.trim().length > MESSAGE_TEXT_LIMIT;
}
