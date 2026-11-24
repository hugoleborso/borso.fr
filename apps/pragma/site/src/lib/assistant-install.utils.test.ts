import { describe, expect, it } from 'vitest';
import {
  buildAssistantServerUrl,
  buildClaudeCodeCommand,
  buildCopilotCommand,
  buildGeminiCommand,
  buildVibeConfiguration,
  listAssistantInstallations,
} from './assistant-install.utils';

const PRODUCTION_ORIGIN = 'https://pragma.borso.fr';
const PRODUCTION_SERVER_URL = 'https://pragma.borso.fr/mcp';
const PREVIEW_ORIGIN = 'https://pragma-pr-212.preview.borso.fr';
const PREVIEW_API_BASE = 'https://pragma-pr-212-api.preview.borso.fr';
const SAME_ORIGIN_API_BASE = '';

// @FollowsBlueprint test-pure-unit
describe('assistant-install.utils', () => {
  it('serves the assistants from the page origin when the API shares it, as in production', () => {
    expect(
      buildAssistantServerUrl({ apiBase: SAME_ORIGIN_API_BASE, pageOrigin: PRODUCTION_ORIGIN }),
    ).toBe(PRODUCTION_SERVER_URL);
    expect(
      buildAssistantServerUrl({
        apiBase: SAME_ORIGIN_API_BASE,
        pageOrigin: `${PRODUCTION_ORIGIN}/`,
      }),
    ).toBe(PRODUCTION_SERVER_URL);
  });

  it('serves the assistants from the API host on a preview, where the page host only serves the site', () => {
    expect(buildAssistantServerUrl({ apiBase: PREVIEW_API_BASE, pageOrigin: PREVIEW_ORIGIN })).toBe(
      `${PREVIEW_API_BASE}/mcp`,
    );
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

  it('writes the VS Code command that registers the server with GitHub Copilot', () => {
    expect(buildCopilotCommand(PRODUCTION_SERVER_URL)).toBe(
      `code --add-mcp '{"name":"pragma","type":"http","url":"https://pragma.borso.fr/mcp"}'`,
    );
  });

  it('writes the Gemini CLI command at user scope', () => {
    expect(buildGeminiCommand(PRODUCTION_SERVER_URL)).toBe(
      'gemini mcp add --transport http --scope user pragma https://pragma.borso.fr/mcp',
    );
  });

  it('lists Claude Code, Vibe, GitHub Copilot, then Gemini', () => {
    expect(
      listAssistantInstallations({ apiBase: SAME_ORIGIN_API_BASE, pageOrigin: PRODUCTION_ORIGIN }),
    ).toEqual([
      { id: 'claude-code', snippet: buildClaudeCodeCommand(PRODUCTION_SERVER_URL) },
      { id: 'vibe', snippet: buildVibeConfiguration(PRODUCTION_SERVER_URL) },
      { id: 'copilot', snippet: buildCopilotCommand(PRODUCTION_SERVER_URL) },
      { id: 'gemini', snippet: buildGeminiCommand(PRODUCTION_SERVER_URL) },
    ]);
  });
});
