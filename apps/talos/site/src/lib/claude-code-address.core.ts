/** @DependsOnExternal claude-code-web */

const CLAUDE_CODE_ADDRESS = 'https://claude.ai/code/new';
const PREAMBLE_SEPARATOR = '\n\n';

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
  const parameters: [string, string][] = [['repo', launch.repository]];
  if (launch.environmentId !== null) parameters.push(['environment', launch.environmentId]);
  parameters.push(['q', launch.prompt]);
  const query = parameters.map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('&');
  return `${CLAUDE_CODE_ADDRESS}?${query}`;
}

export interface ClaudeCodeTargetShape {
  readonly repository: string;
  readonly environments: Readonly<Record<ClaudeCodeEnvironment, string | null>>;
}

export function buildEnvironmentAddress(
  target: ClaudeCodeTargetShape | undefined,
  environment: ClaudeCodeEnvironment,
  prompt: string,
): string | undefined {
  if (target === undefined) return undefined;
  return buildClaudeCodeAddress({
    repository: target.repository,
    environmentId: target.environments[environment],
    prompt,
  });
}
