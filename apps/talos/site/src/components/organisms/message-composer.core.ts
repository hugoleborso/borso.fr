/** @DependsOnExternal claude-code-web */

const CLAUDE_CODE_ADDRESS = 'https://claude.ai/code';
const PREAMBLE_SEPARATOR = '\n\n';

export const LONG_MESSAGE_THRESHOLD = 6000;

export type ClaudeCodeEnvironment = 'talos' | 'build';

export interface ClaudeCodeLaunch {
  readonly repository: string;
  readonly environmentId: string | null;
  readonly prompt: string;
}

// @FollowsBlueprint core-view-intent
export function composeTalosPrompt(preamble: string, text: string): string {
  const message = text.trim();
  return message === '' ? preamble : `${preamble}${PREAMBLE_SEPARATOR}${message}`;
}

export function buildClaudeCodeAddress(launch: ClaudeCodeLaunch): string {
  const parameters: [string, string][] = [['repositories', launch.repository]];
  if (launch.environmentId !== null) parameters.push(['environment', launch.environmentId]);
  parameters.push(['prompt', launch.prompt]);
  const query = parameters.map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('&');
  return `${CLAUDE_CODE_ADDRESS}?${query}`;
}

export function isMessageTooLong(text: string): boolean {
  return text.length > LONG_MESSAGE_THRESHOLD;
}
