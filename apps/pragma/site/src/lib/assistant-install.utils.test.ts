import { describe, expect, it } from 'vitest';
import {
  buildAssistantServerUrl,
  buildClaudeCodeCommand,
  buildVibeConfiguration,
  listAssistantInstallations,
} from './assistant-install.utils';

const PRODUCTION_ORIGIN = 'https://pragma.borso.fr';
const PRODUCTION_SERVER_URL = 'https://pragma.borso.fr/mcp';
const PREVIEW_ORIGIN = 'https://pragma-pr-212.preview.borso.fr';

// @FollowsBlueprint test-pure-unit
describe('assistant-install.utils', () => {
  it('serves the assistants from the page origin, so a preview shows its own address', () => {
    expect(buildAssistantServerUrl(PRODUCTION_ORIGIN)).toBe(PRODUCTION_SERVER_URL);
    expect(buildAssistantServerUrl(`${PRODUCTION_ORIGIN}/`)).toBe(PRODUCTION_SERVER_URL);
    expect(buildAssistantServerUrl(PREVIEW_ORIGIN)).toBe(`${PREVIEW_ORIGIN}/mcp`);
  });

  it('writes the Claude Code command the spec names', () => {
    expect(buildClaudeCodeCommand(PRODUCTION_SERVER_URL)).toBe(
      'claude mcp add --transport http --scope user pragma https://pragma.borso.fr/mcp',
    );
  });

  it('writes the Vibe configuration block with OAuth and the pragma scope', () => {
    expect(buildVibeConfiguration(PRODUCTION_SERVER_URL)).toBe(
      [
        '[[mcp_servers]]',
        'name = "pragma"',
        'transport = "streamable-http"',
        'url = "https://pragma.borso.fr/mcp"',
        '[mcp_servers.auth]',
        'type = "oauth"',
        'scopes = ["pragma"]',
      ].join('\n'),
    );
  });

  it('lists Claude Code, Vibe and the connector address, in that order', () => {
    expect(listAssistantInstallations(PRODUCTION_ORIGIN)).toEqual([
      { id: 'claude-code', snippet: buildClaudeCodeCommand(PRODUCTION_SERVER_URL) },
      { id: 'vibe', snippet: buildVibeConfiguration(PRODUCTION_SERVER_URL) },
      { id: 'connector', snippet: PRODUCTION_SERVER_URL },
    ]);
  });
});
