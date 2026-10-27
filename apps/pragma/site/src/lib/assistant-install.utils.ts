/** @Feature auth */

const ASSISTANT_SERVER_PATH = '/mcp';
const SERVER_NAME = 'pragma';

export type AssistantInstallationId = 'claude-code' | 'vibe' | 'connector';

export interface AssistantInstallation {
  readonly id: AssistantInstallationId;
  readonly snippet: string;
}

// @FollowsBlueprint utils-pure-module
export function buildAssistantServerUrl(pageOrigin: string): string {
  return new URL(ASSISTANT_SERVER_PATH, pageOrigin).toString();
}

export function buildClaudeCodeCommand(serverUrl: string): string {
  return `claude mcp add --transport http --scope user ${SERVER_NAME} ${serverUrl}`;
}

export function buildVibeConfiguration(serverUrl: string): string {
  return [
    '[[mcp_servers]]',
    `name = "${SERVER_NAME}"`,
    'transport = "streamable-http"',
    `url = "${serverUrl}"`,
    '[mcp_servers.auth]',
    'type = "oauth"',
    `scopes = ["${SERVER_NAME}"]`,
  ].join('\n');
}

export function listAssistantInstallations(pageOrigin: string): readonly AssistantInstallation[] {
  const serverUrl = buildAssistantServerUrl(pageOrigin);
  return [
    { id: 'claude-code', snippet: buildClaudeCodeCommand(serverUrl) },
    { id: 'vibe', snippet: buildVibeConfiguration(serverUrl) },
    { id: 'connector', snippet: serverUrl },
  ];
}
