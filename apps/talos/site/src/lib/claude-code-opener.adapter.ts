/** @DependsOnExternal browser-display-mode */

import type { ClaudeCodeOpener } from './claude-code-address.core';

// @FollowsBlueprint browser-clipboard-write
export function detectClaudeCodeOpener(): ClaudeCodeOpener {
  const isIosHomeScreenApp = 'standalone' in navigator && navigator.standalone === true;
  return isIosHomeScreenApp ? 'app' : 'web';
}
