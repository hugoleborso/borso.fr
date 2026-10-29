import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { AssistantConnections } from './AssistantConnections';

const clipboard = vi.hoisted(() => ({
  didCopyTextToClipboard: vi.fn(() => Promise.resolve(true)),
}));
vi.mock('../../lib/clipboard.adapter', () => clipboard);

function renderConnections(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <AssistantConnections />
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('AssistantConnections', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stub = stubFetch(() => Promise.resolve(jsonResponse({ grants: [] })));
  });

  afterEach(() => {
    cleanup();
    clipboard.didCopyTextToClipboard.mockClear();
    stub?.restore();
  });

  it('shows Claude and Vibe with their marks and no command to read', () => {
    renderConnections();
    expect(screen.getByText('Claude Code')).toBeTruthy();
    expect(screen.getByText('Mistral Vibe')).toBeTruthy();
    expect(document.querySelectorAll('svg path').length).toBeGreaterThanOrEqual(2);
    expect(document.querySelector('pre, code')).toBe(null);
  });

  it('copies the Claude Code command from its own button', async () => {
    renderConnections();
    fireEvent.click(screen.getByRole('button', { name: 'Copy the command: Claude Code' }));
    expect(await screen.findByText('Copied.')).toBeTruthy();
    expect(clipboard.didCopyTextToClipboard).toHaveBeenCalledWith(
      expect.stringContaining('claude mcp add'),
    );
  });

  it('copies the Vibe configuration from its own button', async () => {
    renderConnections();
    fireEvent.click(screen.getByRole('button', { name: 'Copy the command: Mistral Vibe' }));
    expect(await screen.findByText('Copied.')).toBeTruthy();
    expect(clipboard.didCopyTextToClipboard).toHaveBeenCalledWith(
      expect.stringContaining('[[mcp_servers]]'),
    );
  });
});
