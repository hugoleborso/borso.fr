/** @DependsOnExternal claude-code-web */

const PREAMBLE_SEPARATOR = '\n\n';

export type ClaudeCodeEnvironment = 'talos' | 'build';
export type ClaudeCodeOpener = 'app' | 'web';

const CLAUDE_CODE_ADDRESS: Readonly<Record<ClaudeCodeOpener, string>> = {
  app: 'claude://code/new',
  web: 'https://claude.ai/code/new',
};

const NEW_BROWSING_CONTEXT = '_blank';

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

export function buildClaudeCodeAddress(launch: ClaudeCodeLaunch, opener: ClaudeCodeOpener): string {
  const parameters: [string, string][] = [['repo', launch.repository]];
  if (launch.environmentId !== null && opener === 'web') {
    parameters.push(['environment', launch.environmentId]);
  }
  parameters.push(['q', launch.prompt]);
  const query = parameters.map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('&');
  return `${CLAUDE_CODE_ADDRESS[opener]}?${query}`;
}

export interface ClaudeCodeTargetShape {
  readonly repository: string;
  readonly environments: Readonly<Record<ClaudeCodeEnvironment, string | null>>;
}

export function buildEnvironmentAddress(
  target: ClaudeCodeTargetShape | undefined,
  environment: ClaudeCodeEnvironment,
  prompt: string,
  opener: ClaudeCodeOpener,
): string | undefined {
  if (target === undefined) return undefined;
  return buildClaudeCodeAddress(
    {
      repository: target.repository,
      environmentId: target.environments[environment],
      prompt,
    },
    opener,
  );
}

export function selectClaudeCodeLinkTarget(opener: ClaudeCodeOpener): string | undefined {
  return opener === 'web' ? NEW_BROWSING_CONTEXT : undefined;
}
