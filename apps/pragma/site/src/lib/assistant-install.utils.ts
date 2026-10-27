/** @Feature auth */

const ASSISTANT_SERVER_PATH = '/mcp';
const SERVER_NAME = 'pragma';

export type AssistantInstallationId = 'claude-code' | 'vibe' | 'connector';

export interface AssistantServerLocation {
  readonly apiBase: string;
  readonly pageOrigin: string;
}

export interface AssistantInstallation {
  readonly id: AssistantInstallationId;
  readonly snippet: string;
}

// @FollowsBlueprint utils-pure-module
export function buildAssistantServerUrl(location: AssistantServerLocation): string {
  const serverOrigin = location.apiBase === '' ? location.pageOrigin : location.apiBase;
  return new URL(ASSISTANT_SERVER_PATH, serverOrigin).toString();
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

export function listAssistantInstallations(
  location: AssistantServerLocation,
): readonly AssistantInstallation[] {
  const serverUrl = buildAssistantServerUrl(location);
  return [
    { id: 'claude-code', snippet: buildClaudeCodeCommand(serverUrl) },
    { id: 'vibe', snippet: buildVibeConfiguration(serverUrl) },
    { id: 'connector', snippet: serverUrl },
  ];
}
