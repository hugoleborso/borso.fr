import type { ClaudeCodeEnvironment } from '../../lib/claude-code-address.core';

export const LONG_MESSAGE_THRESHOLD = 6000;

const ALWAYS_LINKED_ENVIRONMENT: ClaudeCodeEnvironment = 'build';

// @FollowsBlueprint core-view-intent
export function isMessageTooLong(text: string): boolean {
  return text.length > LONG_MESSAGE_THRESHOLD;
}

export function isEnvironmentLinked(
  environment: ClaudeCodeEnvironment,
  isRoutineUnconfigured: boolean,
): boolean {
  return environment === ALWAYS_LINKED_ENVIRONMENT || isRoutineUnconfigured;
}
